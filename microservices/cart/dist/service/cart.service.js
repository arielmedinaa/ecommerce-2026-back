"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CartContadoService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartContadoService = void 0;
const cart_schema_1 = require("../schemas/cart.schema");
const transaccion_schema_1 = require("../schemas/transaccion.schema");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const obtenerClave_1 = require("@shared/common/utils/obtenerClave");
const cart_constants_1 = require("../constants/cart.constants");
const microservices_1 = require("@nestjs/microservices");
const resilient_client_decorator_1 = require("@shared/common/decorators/resilient-client.decorator");
const cache_persistente_service_1 = require("@shared/common/services/cache-persistente.service");
const cart_service_spec_1 = require("./cart.service.spec");
const cart_error_service_1 = require("./errors/cart-error.service");
const moment_timezone_1 = require("moment-timezone");
const https = require("https");
const mysql = require("mysql2/promise");
const cart_constants_2 = require("../constants/cart.constants");
const rxjs_1 = require("rxjs");
let CartContadoService = CartContadoService_1 = class CartContadoService {
    constructor(carrito, transacciones, productsService, paymentsService, obtenerClaveService, cartValidationService, cartErrorService, resilientService, cacheService) {
        this.carrito = carrito;
        this.transacciones = transacciones;
        this.productsService = productsService;
        this.paymentsService = paymentsService;
        this.obtenerClaveService = obtenerClaveService;
        this.cartValidationService = cartValidationService;
        this.cartErrorService = cartErrorService;
        this.resilientService = resilientService;
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(CartContadoService_1.name);
        this.cartCache = new Map();
        this.cacheTTL = 30 * 1000;
    }
    async addCart(clienteToken, cuenta, codigo, producto) {
        const validation = await this.cartValidationService.validateCartPayload(clienteToken, cuenta, codigo, producto);
        if (!validation.isValid) {
            return validation.error;
        }
        let filtro = {
            'cliente.equipo': clienteToken,
        };
        if (codigo === 0) {
            filtro.estado = 1;
        }
        else {
            filtro.codigo = codigo;
        }
        if (cuenta) {
            filtro.cuenta = cuenta;
        }
        const articuloTipo = producto.credito ? 'credito' : 'contado';
        const carritoExistente = await this.carrito
            .findOne(filtro)
            .sort({ codigo: -1 });
        if (carritoExistente === null || carritoExistente === undefined) {
            const nuevoCodigo = await this.obtenerClaveService.obtenerClave('carrito');
            const nuevoCarrito = new this.carrito({
                ...(0, cart_constants_1.NEW_CART_INITIAL_STATE)(nuevoCodigo, clienteToken, cuenta),
                articulos: {
                    [articuloTipo]: [producto],
                    [articuloTipo === 'credito' ? 'contado' : 'credito']: [],
                },
            });
            await nuevoCarrito.save();
            return {
                data: [nuevoCarrito],
                success: true,
                message: 'CARRITO CREADO CON ÉXITO',
            };
        }
        if (carritoExistente.proceso) {
            await this.transacciones.updateOne({ carrito: carritoExistente.codigo, estado: 1 }, { $set: { estado: 0 } });
            await this.carrito.updateOne({ codigo: carritoExistente.codigo }, { $set: { proceso: '' } });
        }
        const buscarProductoConMismasCondiciones = (carrito, producto, tipo) => {
            const productosMismoCodigo = carrito.articulos[tipo].filter((articulo) => String(articulo.codigo) === String(producto.codigo));
            if (tipo === 'credito') {
                return productosMismoCodigo.find((articulo) => articulo.credito?.cuota === producto.credito?.cuota);
            }
            return productosMismoCodigo[0];
        };
        const actualizarCantidadProducto = (carrito, producto, tipo) => {
            carrito.articulos[tipo] = carrito.articulos[tipo].map((articulo) => {
                if (tipo === 'credito') {
                    return String(articulo.codigo) === String(producto.codigo) &&
                        articulo.credito?.cuota === producto.credito?.cuota
                        ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
                        : articulo;
                }
                else {
                    return String(articulo.codigo) === String(producto.codigo)
                        ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
                        : articulo;
                }
            });
        };
        const agregarNuevoProducto = (carrito, producto, tipo) => {
            carrito.articulos[tipo].push(producto);
        };
        const productoExistente = buscarProductoConMismasCondiciones(carritoExistente, producto, articuloTipo);
        if (productoExistente) {
            actualizarCantidadProducto(carritoExistente, producto, articuloTipo);
            await this.carrito.updateOne({ codigo: carritoExistente.codigo }, {
                $set: {
                    [`articulos.${articuloTipo}`]: carritoExistente.articulos[articuloTipo],
                },
            });
        }
        else {
            agregarNuevoProducto(carritoExistente, producto, articuloTipo);
            await this.carrito.updateOne({ codigo: carritoExistente.codigo }, { $push: { [`articulos.${articuloTipo}`]: producto } });
        }
        return {
            data: [carritoExistente],
            success: true,
            message: 'PRODUCTO AGREGADO AL CARRITO',
        };
    }
    async getCart(clienteToken, cuenta, codigo) {
        const filtro = {
            $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
        };
        codigo === 0 ? (filtro.estado = 1) : (filtro.codigo = codigo);
        const cacheKey = `cart_${clienteToken}_${cuenta}_${codigo}`;
        const now = Date.now();
        const cached = this.cartCache.get(cacheKey);
        if (cached && now - cached.timestamp < this.cacheTTL) {
            return {
                data: cached.data,
                success: true,
                message: 'Carrito recuperado',
            };
        }
        const resultado = await this.carrito
            .findOne(filtro, { _id: 0, proceso: 0, transaccion: 0, __v: 0 })
            .sort({ codigo: -1 })
            .lean();
        if (!resultado) {
            return { data: [], success: false, message: 'Carrito no encontrado' };
        }
        const articulosRaw = [...(resultado.articulos?.contado || [])];
        const codigos = [...new Set(articulosRaw.map((a) => String(a.codigo)))];
        const productsCacheKey = `cart_products_${codigos.join('_')}`;
        try {
            const [productos] = await this.cacheService.getWithFallback(productsCacheKey, async () => {
                return await Promise.all([
                    this.resilientService.sendWithResilience(this.productsService, { cmd: 'get_products' }, {
                        ids: codigos,
                        fields: 'codigo,marca,categorias,subcategorias,promos',
                    }, {
                        retries: 3,
                        delay: 1000,
                        fallback: async () => {
                            this.logger.warn('Using fallback products for cart');
                            return [];
                        },
                        circuitBreaker: {
                            failureThreshold: 3,
                            resetTimeout: 30000,
                        },
                    }),
                ]);
            }, this.cacheTTL);
            const enriquecerArticulos = (lista) => {
                return lista.map((art) => {
                    const p = productos.find((ip) => ip.codigo === String(art.codigo));
                    return {
                        ...art,
                        marca: p?.marca || null,
                        categoria: p?.categorias?.[0]?.nombre || null,
                        subcategoria: p?.subcategorias?.[0]?.nombre || null,
                        isCombo: p?.tipo === 'combo',
                        isPromo: p?.promos && p.promos.length > 0,
                        codigoPromo: p?.promos?.[0]?.codigo || null,
                        nombrePromo: p?.promos?.[0]?.nombre || null,
                    };
                });
            };
            if (resultado.articulos) {
                if (resultado.articulos.contado) {
                    resultado.articulos.contado = enriquecerArticulos(resultado.articulos.contado);
                }
            }
            return {
                data: {
                    codigo: resultado.codigo,
                    articulos: resultado.articulos,
                },
                success: true,
                message: 'Carrito recuperado',
            };
        }
        catch (error) {
            return {
                data: {
                    codigo: resultado.codigo,
                    articulos: resultado.articulos,
                },
                success: true,
                message: 'Carrito recuperado (sin información adicional de productos)',
            };
        }
        finally {
            this.cartCache.set(cacheKey, {
                data: resultado,
                timestamp: Date.now(),
            });
        }
    }
    async getAllCart(clienteToken, limit, skip, sort, order = 'desc') {
        const resultado = await this.carrito
            .find({ 'cliente.equipo': clienteToken, estado: 0 })
            .lean()
            .limit(limit)
            .skip(skip)
            .sort({ [sort]: order === 'desc' ? -1 : 1 });
        const carritosConEstado = await Promise.all(resultado.map(async (carrito) => {
            const estadoEcont = await this.getEstadoSolicitudEcont(carrito.codigo);
            return {
                ...carrito,
                estadoSolicitud: estadoEcont,
            };
        }));
        return {
            data: carritosConEstado,
            success: true,
            message: 'Carritos recuperados',
        };
    }
    async finishCart(clienteToken, cuenta, codigo, process) {
        const validation = await this.cartValidationService.validateFinishCart(clienteToken, cuenta, codigo, process);
        if (!validation.isValid) {
            return validation.error;
        }
        let filtro = {
            'cliente.equipo': clienteToken,
            codigo,
            estado: { $ne: 0 },
        };
        if (cuenta) {
            filtro.cuenta = cuenta;
        }
        const carrito = await this.carrito.findOne(filtro).lean();
        if (!carrito) {
            const error = new Error('CARRITO NO ENCONTRADO O CON POSIBLE PAGO CONFIRMADO');
            await this.cartErrorService.logMicroserviceError(error, codigo?.toString(), 'finishCart', {
                motivo: 'carrito_no_encontrado_o_con_posible_pago_confirmado',
                filtro,
                codigo,
            });
            throw error;
        }
        let metodoPago = '';
        let montoTotal = 0;
        let descripcion = '';
        const paymentConfig = {
            'debito contra entrega': {
                metodo: 'efectivo contra entrega',
                getMonto: () => process.cuotas?.reduce((total, cuota) => total + cuota.importe, 0) ||
                    0,
                getDescripcion: () => `Débito contra entrega - ${process.cantidadcuotas} cuotas`,
            },
            pagopar: {
                metodo: 'pagopar',
                getMonto: () => process.monto || 0,
                getDescripcion: () => 'Pago PagoPar',
            },
            bancard: {
                metodo: 'bancard',
                getMonto: () => process.monto || 0,
                getDescripcion: () => 'Pago Bancard',
            },
            'tarjeta contra entrega': {
                metodo: 'tarjeta contra entrega',
                getMonto: () => process.monto || 0,
                getDescripcion: () => 'Tarjeta contra entrega',
            },
        };
        const tipo = process.tipo?.toLowerCase() || '';
        const config = Object.keys(paymentConfig).find((key) => tipo.includes(key));
        const paymentData = config
            ? paymentConfig[config]
            : {
                metodo: 'efectivo contra entrega',
                getMonto: () => process.monto || 0,
                getDescripcion: () => process.tipo || 'Pago contra entrega',
            };
        metodoPago = paymentData.metodo;
        montoTotal = paymentData.getMonto();
        descripcion = paymentData.getDescripcion();
        try {
            const pagoResponse = await (0, rxjs_1.firstValueFrom)(this.paymentsService.send({ cmd: 'registrar_pago' }, {
                codigoCarrito: codigo,
                carrito: carrito,
                metodoPago: metodoPago,
                monto: montoTotal,
                moneda: process.moneda || 'PYG',
                cliente: {
                    ...process.cliente,
                    equipo: clienteToken,
                },
                descripcion: descripcion,
                respuestaPagopar: metodoPago === 'pagopar' ? process.pagoparResponse || {} : {},
                respuestaBancard: metodoPago === 'bancard' ? process.bancardResponse || {} : {},
            }));
            await this.carrito.updateOne(filtro, {
                $set: {
                    pago: {
                        ...process,
                        pagoId: pagoResponse.data.idTransaccion,
                        registradoEnPayments: true,
                    },
                    estado: 0,
                    cliente: {
                        ...process.cliente,
                        equipo: clienteToken,
                    },
                    envio: process?.envio || {},
                    finished: (0, moment_timezone_1.default)()
                        .tz('America/Asuncion')
                        .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                },
            });
            setImmediate(async () => {
                try {
                    await this.insertarSolicitudesCentralApp({}, clienteToken, '', codigo);
                }
                catch (centralAppError) {
                    console.error('Error al enviar solicitudes a Central App (segundo plano):', centralAppError);
                }
            });
            return {
                data: [pagoResponse.data],
                success: true,
                message: 'CARRITO FINALIZADO Y PAGO REGISTRADO CON ÉXITO',
            };
        }
        catch (error) {
            await this.cartErrorService.logMicroserviceError(error, codigo?.toString(), 'finishCart', {
                motivo: 'error_finalizar_carrito',
                error: error.message,
                codigo,
            });
            return {
                data: [],
                success: false,
                message: `ERROR AL FINALIZAR CARRITO: ${error.message}`,
            };
        }
    }
    async insertarCarritos(parametros) {
        const url = `${process.env.CENTRAL_APP_URL}`;
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(parametros);
            const options = {
                hostname: `${process.env.CENTRAL_APP_HOST}`,
                port: 3055,
                path: '/api/solicitud_ecommerce/insert_ecommerce_solicitudes',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
                rejectUnauthorized: false,
                checkServerIdentity: () => undefined,
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(1);
                    }
                    else {
                        console.error(`Error HTTP: ${res.statusCode}`, data);
                        resolve(0);
                    }
                });
            });
            req.on('error', (error) => {
                console.error('Hubo un error al realizar la petición:', error);
                resolve(0);
            });
            req.write(postData);
            req.end();
        });
    }
    async insertarSolicitudesCentralApp(solicitud, clienteToken, cuenta, codigo, clienteInfo) {
        const validation = await this.cartValidationService.validateInsertCentralApp(solicitud, clienteToken, codigo, clienteInfo);
        if (!validation.isValid) {
            return validation.error;
        }
        const filtro = {
            'cliente.equipo': clienteToken,
            codigo,
        };
        if (cuenta) {
            filtro.cuenta = cuenta;
        }
        try {
            let datos = await this.carrito.findOne(filtro);
            if (!datos) {
                return {
                    data: [],
                    success: false,
                    message: 'Carrito no encontrado',
                };
            }
            const solicitudesPorCuota = new Map();
            if (datos.articulos &&
                datos.articulos.credito &&
                Array.isArray(datos.articulos.credito)) {
                datos.articulos.credito.forEach((articulo) => {
                    const cuotas = articulo.credito?.cuota || 0;
                    if (!solicitudesPorCuota.has(cuotas)) {
                        solicitudesPorCuota.set(cuotas, []);
                    }
                    solicitudesPorCuota.get(cuotas).push(articulo);
                });
            }
            const resultados = [];
            if (datos.articulos &&
                datos.articulos.contado &&
                Array.isArray(datos.articulos.contado) &&
                datos.articulos.contado.length > 0) {
                const solicitudContado = (0, cart_constants_1.NEW_SOLICITUD_INITIAL_STATE)(codigo, clienteToken, cuenta || '');
                solicitudContado.cliente = {
                    ...solicitudContado.cliente,
                    equipo: datos.cliente?.equipo ||
                        solicitudContado.cliente?.equipo ||
                        clienteToken,
                };
                solicitudContado.pago = datos.pago;
                solicitudContado.estado = datos.estado;
                solicitudContado.envio =
                    solicitud['envio'] || datos.envio || solicitudContado.envio;
                solicitudContado.codigo = codigo;
                solicitudContado.articulos = {
                    contado: datos.articulos.contado.map((item) => {
                        const processedItem = { ...item };
                        if (item.isCombo && !item.isPromo) {
                            processedItem.is_combo = 1;
                            processedItem.is_promo = 0;
                            processedItem.id_promo = null;
                            processedItem.nombrePromo = null;
                        }
                        else if (!item.isCombo && item.isPromo) {
                            processedItem.is_combo = 0;
                            processedItem.is_promo = 1;
                            processedItem.id_promo = item.promoCodigo || null;
                            processedItem.nombrePromo = item.promoNombre || null;
                        }
                        else if (item.isCombo && item.isPromo) {
                            processedItem.is_combo = 1;
                            processedItem.is_promo = 1;
                            processedItem.id_promo = item.promoCodigo || null;
                            processedItem.nombrePromo = item.promoNombre || null;
                        }
                        else {
                            processedItem.is_combo = 0;
                            processedItem.is_promo = 0;
                            processedItem.id_promo = null;
                            processedItem.nombrePromo = null;
                        }
                        return processedItem;
                    }),
                    credito: [],
                };
                const resultadoContado = await this.insertarCarritos(solicitudContado);
                resultados.push({
                    cuotas: 0,
                    success: resultadoContado === 1,
                    articulosCount: datos.articulos.contado.length,
                });
            }
            for (const [cuotas, articulos] of solicitudesPorCuota.entries()) {
                if (cuotas === 0)
                    continue;
                const nuevaSolicitud = (0, cart_constants_1.NEW_SOLICITUD_INITIAL_STATE)(codigo, clienteToken, cuenta || '');
                nuevaSolicitud.cliente = {
                    ...nuevaSolicitud.cliente,
                    equipo: datos.cliente?.equipo ||
                        nuevaSolicitud.cliente?.equipo ||
                        clienteToken,
                };
                nuevaSolicitud.estado = datos.estado;
                nuevaSolicitud.pago = datos.pago;
                nuevaSolicitud.envio =
                    solicitud['envio'] || datos.envio || nuevaSolicitud.envio;
                nuevaSolicitud.codigo = codigo;
                nuevaSolicitud.articulos = {
                    contado: [],
                    credito: articulos.map((articulo) => {
                        const processedItem = {
                            codigo: articulo.codigo,
                            nombre: articulo.nombre,
                            ruta: articulo.ruta,
                            imagen: articulo.imagen,
                            cantidad: articulo.cantidad,
                            precio: articulo.credito?.precio || articulo.precio,
                            cuota: cuotas,
                        };
                        if (articulo.isCombo && !articulo.isPromo) {
                            processedItem.is_combo = 1;
                            processedItem.is_promo = 0;
                            processedItem.id_promo = null;
                            processedItem.nombrePromo = null;
                        }
                        else if (!articulo.isCombo && articulo.isPromo) {
                            processedItem.is_combo = 0;
                            processedItem.is_promo = 1;
                            processedItem.id_promo = articulo.promoCodigo || null;
                            processedItem.nombrePromo = articulo.promoNombre || null;
                        }
                        else if (articulo.isCombo && articulo.isPromo) {
                            processedItem.is_combo = 1;
                            processedItem.is_promo = 1;
                            processedItem.id_promo = articulo.promoCodigo || null;
                            processedItem.nombrePromo = articulo.promoNombre || null;
                        }
                        else {
                            processedItem.is_combo = 0;
                            processedItem.is_promo = 0;
                            processedItem.id_promo = null;
                            processedItem.nombrePromo = null;
                        }
                        return processedItem;
                    }),
                };
                const resultado = await this.insertarCarritos(nuevaSolicitud);
                resultados.push({
                    cuotas,
                    success: resultado === 1,
                    articulosCount: articulos.length,
                });
            }
            const successCount = resultados.filter((r) => r.success).length;
            const totalCount = resultados.length;
            return {
                data: resultados,
                success: successCount === totalCount && totalCount > 0,
                message: totalCount > 0
                    ? `${successCount}/${totalCount} solicitudes insertadas en Central App`
                    : 'No hay artículos de crédito para procesar',
            };
        }
        catch (error) {
            return {
                data: [],
                success: false,
                message: `ERROR AL INSERTAR EN CENTRAL APP: ${error.message}`,
            };
        }
    }
    async getEstadoSolicitudEcont(codigoCarrito) {
        try {
            const estadoSoli = await this.consultarEstadoEcontDB(codigoCarrito);
            return cart_constants_2.ESTADO_SOLICITUD_MAP[estadoSoli] || 'Estado no identificado';
        }
        catch (error) {
            console.error(`Error consultando estado para carrito ${codigoCarrito}:`, error);
            return 'No se pudo consultar el estado';
        }
    }
    async consultarEstadoEcontDB(secuencia) {
        let connection = null;
        try {
            const dbName = process.env.ECONT_DB_DATABASE;
            if (!dbName) {
                throw new Error('ECONT_DB_DATABASE environment variable is not set');
            }
            connection = await mysql.createConnection({
                host: process.env.ECONT_DB_HOST,
                port: parseInt(process.env.ECONT_DB_PORT || '3306'),
                user: process.env.ECONT_DB_USER,
                password: process.env.ECONT_DB_PASSWORD,
                database: dbName,
            });
            const [rows] = await connection.query('Select estado_soli from solicitudcab sb inner join cs_solicitud_ecommerce_cabecera csec on csec.solicitudcab_secuencia = sb.secuencia where csec.mongo_id = ?', [secuencia]);
            const result = rows;
            await connection.end();
            return result.length > 0 ? result[0].estado_soli : '00';
        }
        catch (error) {
            if (connection) {
                await connection.end().catch(() => { });
            }
            console.error('Error consultando base de datos Econt:', error);
            return '00';
        }
    }
};
exports.CartContadoService = CartContadoService;
exports.CartContadoService = CartContadoService = CartContadoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cart_schema_1.Cart.name)),
    __param(1, (0, mongoose_1.InjectModel)(transaccion_schema_1.Transaccion.name)),
    __param(2, (0, common_1.Inject)('PRODUCTS_SERVICE')),
    __param(3, (0, common_1.Inject)('PAYMENTS_SERVICE')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        microservices_1.ClientProxy,
        microservices_1.ClientProxy, typeof (_a = typeof obtenerClave_1.ObtenerClaveService !== "undefined" && obtenerClave_1.ObtenerClaveService) === "function" ? _a : Object, cart_service_spec_1.CartValidationService,
        cart_error_service_1.CartErrorService, typeof (_b = typeof resilient_client_decorator_1.ResilientService !== "undefined" && resilient_client_decorator_1.ResilientService) === "function" ? _b : Object, typeof (_c = typeof cache_persistente_service_1.CachePersistenteService !== "undefined" && cache_persistente_service_1.CachePersistenteService) === "function" ? _c : Object])
], CartContadoService);
//# sourceMappingURL=cart.service.js.map