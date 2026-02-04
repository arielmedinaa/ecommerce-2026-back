import { Cart } from '../schemas/cart.schema';
import { Transaccion } from '../schemas/transaccion.schema';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObtenerClaveService } from '@shared/common/utils/obtenerClave';
import {
  NEW_CART_INITIAL_STATE,
  NEW_SOLICITUD_INITIAL_STATE,
} from '@cart/constants/cart.constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CartValidationService } from './cart.service.spec';
import { CartErrorService } from './errors/cart-error.service';
import moment from 'moment-timezone';
import * as https from 'https';

@Injectable()
export class CartContadoService {
  constructor(
    @InjectModel(Cart.name) private readonly carrito: Model<Cart>,
    @InjectModel(Transaccion.name)
    @Inject('PRODUCTS_SERVICE') private readonly productsService: ClientProxy,
    @Inject('PAYMENTS_SERVICE') private readonly paymentsService: ClientProxy,
    private readonly transacciones: Model<Transaccion>,
    private readonly obtenerClaveService: ObtenerClaveService,
    private readonly cartValidationService: CartValidationService,
    private readonly cartErrorService: CartErrorService,
  ) {}

  async addCart(
    clienteToken: string,
    cuenta: string,
    codigo?: number,
    producto?: any,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const validation = await this.cartValidationService.validateCartPayload(
      clienteToken,
      cuenta,
      codigo,
      producto,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    let filtro: any = {
      'cliente.equipo': clienteToken,
    };

    if (codigo === 0) {
      filtro.estado = 1;
    } else {
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
      const nuevoCodigo =
        await this.obtenerClaveService.obtenerClave('carrito');
      const nuevoCarrito = new this.carrito({
        ...NEW_CART_INITIAL_STATE(nuevoCodigo, clienteToken, cuenta),
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
      await this.transacciones.updateOne(
        { carrito: carritoExistente.codigo, estado: 1 },
        { $set: { estado: 0 } },
      );
      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        { $set: { proceso: '' } },
      );
    }

    const buscarProductoConMismasCondiciones = (
      carrito: any,
      producto: any,
      tipo: string,
    ) => {
      const productosMismoCodigo = carrito.articulos[tipo].filter(
        (articulo: any) => String(articulo.codigo) === String(producto.codigo),
      );

      if (tipo === 'credito') {
        return productosMismoCodigo.find(
          (articulo: any) =>
            articulo.credito?.cuota === producto.credito?.cuota,
        );
      }
      return productosMismoCodigo[0];
    };

    const actualizarCantidadProducto = (
      carrito: any,
      producto: any,
      tipo: string,
    ) => {
      carrito.articulos[tipo] = carrito.articulos[tipo].map((articulo: any) => {
        if (tipo === 'credito') {
          return String(articulo.codigo) === String(producto.codigo) &&
            articulo.credito?.cuota === producto.credito?.cuota
            ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
            : articulo;
        } else {
          return String(articulo.codigo) === String(producto.codigo)
            ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
            : articulo;
        }
      });
    };

    const agregarNuevoProducto = (
      carrito: any,
      producto: any,
      tipo: string,
    ) => {
      carrito.articulos[tipo].push(producto);
    };

    const productoExistente = buscarProductoConMismasCondiciones(
      carritoExistente,
      producto,
      articuloTipo,
    );
    if (productoExistente) {
      actualizarCantidadProducto(carritoExistente, producto, articuloTipo);
      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        {
          $set: {
            [`articulos.${articuloTipo}`]:
              carritoExistente.articulos[articuloTipo],
          },
        },
      );
    } else {
      agregarNuevoProducto(carritoExistente, producto, articuloTipo);
      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        { $push: { [`articulos.${articuloTipo}`]: producto } },
      );
    }

    return {
      data: [carritoExistente],
      success: true,
      message: 'PRODUCTO AGREGADO AL CARRITO',
    };
  }

  async getCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: 0,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const filtro: any = {
      $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
    };
    codigo === 0 ? (filtro.estado = 1) : (filtro.codigo = codigo);
    const resultado = await this.carrito
      .findOne(filtro, { _id: 0, proceso: 0, transaccion: 0, __v: 0 })
      .sort({ codigo: -1 })
      .lean();
    if (!resultado) {
      return { data: [], success: false, message: 'Carrito no encontrado' };
    }

    const articulosRaw = [...(resultado.articulos?.contado || [])];
    const codigos = [...new Set(articulosRaw.map((a) => String(a.codigo)))];
    try {
      const productos = await firstValueFrom(
        this.productsService.send(
          { cmd: 'get_products' },
          {
            ids: codigos,
            fields: 'codigo,marca,categorias,subcategorias,promos',
          },
        ),
      );

      const enriquecerArticulos = (lista: any[]) => {
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
          resultado.articulos.contado = enriquecerArticulos(
            resultado.articulos.contado,
          );
        }
      }
      return {
        data: [resultado],
        success: true,
        message: 'Carrito recuperado',
      };
    } catch (error) {
      return {
        data: [resultado],
        success: true,
        message: 'Carrito recuperado (sin información adicional de productos)',
      };
    }
  }

  async finishCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: number,
    process?: any,
  ): Promise<{
    data: any[];
    success: boolean;
    message: string;
  }> {
    const validation = await this.cartValidationService.validateFinishCart(
      clienteToken,
      cuenta,
      codigo,
      process,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    let filtro: any = {
      'cliente.equipo': clienteToken,
      codigo,
      estado: { $ne: 0 },
    };
    if (cuenta) {
      filtro.cuenta = cuenta;
    }

    const carrito = await this.carrito.findOne(filtro).lean();
    if (!carrito) {
      const error = new Error(
        'CARRITO NO ENCONTRADO O CON POSIBLE PAGO CONFIRMADO',
      );
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'finishCart',
        {
          motivo: 'carrito_no_encontrado_o_con_posible_pago_confirmado',
          filtro,
          codigo,
        },
      );
      throw error;
    }

    let metodoPago = '';
    let montoTotal = 0;
    let descripcion = '';
    const paymentConfig = {
      'debito contra entrega': {
        metodo: 'efectivo contra entrega',
        getMonto: () =>
          process.cuotas?.reduce((total, cuota) => total + cuota.importe, 0) ||
          0,
        getDescripcion: () =>
          `Débito contra entrega - ${process.cantidadcuotas} cuotas`,
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
      const pagoResponse = await firstValueFrom(
        this.paymentsService.send(
          { cmd: 'registrar_pago' },
          {
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
            respuestaPagopar:
              metodoPago === 'pagopar' ? process.pagoparResponse || {} : {},
            respuestaBancard:
              metodoPago === 'bancard' ? process.bancardResponse || {} : {},
          },
        ),
      );

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
          finished: moment()
            .tz('America/Asuncion')
            .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        },
      });

      setImmediate(async () => {
        try {
          await this.insertarSolicitudesCentralApp(
            {},
            clienteToken,
            '',
            codigo,
          );
        } catch (centralAppError) {
          console.error(
            'Error al enviar solicitudes a Central App (segundo plano):',
            centralAppError,
          );
        }
      });

      return {
        data: [pagoResponse.data],
        success: true,
        message: 'CARRITO FINALIZADO Y PAGO REGISTRADO CON ÉXITO',
      };
    } catch (error) {
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'finishCart',
        {
          motivo: 'error_finalizar_carrito',
          error: error.message,
          codigo,
        },
      );

      return {
        data: [],
        success: false,
        message: `ERROR AL FINALIZAR CARRITO: ${error.message}`,
      };
    }
  }

  private async insertarCarritos(parametros: any): Promise<number> {
    const url =
      `${process.env.CENTRAL_APP_URL}`;

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
        // Ignorar completamente la verificación del certificado SSL
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
          } else {
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

  async insertarSolicitudesCentralApp(
    solicitud: Object,
    clienteToken: string,
    cuenta?: string,
    codigo?: number,
    clienteInfo?: Object,
  ): Promise<{ data: any[]; success: boolean; message: string }> {
    const validation =
      await this.cartValidationService.validateInsertCentralApp(
        solicitud,
        clienteToken,
        codigo,
        clienteInfo,
      );
    if (!validation.isValid) {
      return validation.error;
    }

    const filtro: any = {
      'cliente.equipo': clienteToken,
      codigo,
    };
    if (cuenta) {
      filtro.cuenta = cuenta;
    }

    try {
      let datos = await this.carrito.findOne(filtro);
      console.log("datos", datos)
      if (!datos) {
        return {
          data: [],
          success: false,
          message: 'Carrito no encontrado',
        };
      }

      // Agrupar artículos de crédito por cantidad de cuotas
      const solicitudesPorCuota: Map<number, any[]> = new Map();

      if (
        datos.articulos &&
        datos.articulos.credito &&
        Array.isArray(datos.articulos.credito)
      ) {
        datos.articulos.credito.forEach((articulo: any) => {
          const cuotas = articulo.credito?.cuota || 0;
          if (!solicitudesPorCuota.has(cuotas)) {
            solicitudesPorCuota.set(cuotas, []);
          }
          solicitudesPorCuota.get(cuotas)!.push(articulo);
        });
      }

      // Crear solicitudes separadas para cada grupo de cuotas y una para contado
      const resultados: {
        cuotas: number;
        success: boolean;
        articulosCount: number;
      }[] = [];

      // 1. Primero crear solicitud para artículos contado (si existen)
      if (
        datos.articulos &&
        datos.articulos.contado &&
        Array.isArray(datos.articulos.contado) &&
        datos.articulos.contado.length > 0
      ) {
        const solicitudContado = NEW_SOLICITUD_INITIAL_STATE(
          codigo!,
          clienteToken,
          cuenta || '',
        );

        // Actualizar datos del cliente y envío
        solicitudContado.cliente = {
          ...solicitudContado.cliente!, // Mantener datos de la constante (documento, razonsocial, etc.)
          equipo:
            datos.cliente?.equipo ||
            solicitudContado.cliente?.equipo ||
            clienteToken, // Usar equipo del carrito, constante o el token
        };
        solicitudContado.pago = datos.pago;
        solicitudContado.estado = datos.estado;
        solicitudContado.envio =
          solicitud['envio'] || datos.envio || solicitudContado.envio;
        solicitudContado.codigo = codigo!;

        // Establecer solo artículos contado con lógica de combo/promo
        solicitudContado.articulos = {
          contado: datos.articulos.contado.map((item: any) => {
            const processedItem: any = { ...item };

            // Aplicar lógica de combo/promo para artículos contado
            // Si tiene combo pero no promo
            if (item.isCombo && !item.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }
            // Si tiene promo pero no combo
            else if (!item.isCombo && item.isPromo) {
              processedItem.is_combo = 0;
              processedItem.is_promo = 1;
              processedItem.id_promo = item.promoCodigo || null;
              processedItem.nombrePromo = item.promoNombre || null;
            }
            // Si tiene ambos
            else if (item.isCombo && item.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 1;
              processedItem.id_promo = item.promoCodigo || null;
              processedItem.nombrePromo = item.promoNombre || null;
            }
            // Si no tiene ninguno
            else {
              processedItem.is_combo = 0;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }

            return processedItem;
          }),
          credito: [], // Sin artículos crédito en esta solicitud
        };

        // const resultadoContado = await this.insertarCarritos(solicitudContado);
        // resultados.push({
        //   cuotas: 0, // 0 representa contado
        //   success: resultadoContado === 1,
        //   articulosCount: datos.articulos.contado.length,
        // });
      }

      // 2. Luego crear solicitudes para artículos de crédito por cuotas
      for (const [cuotas, articulos] of solicitudesPorCuota.entries()) {
        if (cuotas === 0) continue; // Ignorar artículos sin cuotas

        // Crear una nueva solicitud basada en la plantilla
        const nuevaSolicitud = NEW_SOLICITUD_INITIAL_STATE(
          codigo!,
          clienteToken,
          cuenta || '',
        );

        // Actualizar datos del cliente y envío
        nuevaSolicitud.cliente = {
          ...nuevaSolicitud.cliente!, // Mantener datos de la constante (documento, razonsocial, etc.)
          equipo:
            datos.cliente?.equipo ||
            nuevaSolicitud.cliente?.equipo ||
            clienteToken, // Usar equipo del carrito, constante o el token
        };
        nuevaSolicitud.estado = datos.estado;
        nuevaSolicitud.pago = datos.pago;
        nuevaSolicitud.envio =
          solicitud['envio'] || datos.envio || nuevaSolicitud.envio;
        nuevaSolicitud.codigo = codigo!;

        // Establecer artículos de crédito para esta solicitud con lógica de combo/promo
        nuevaSolicitud.articulos = {
          contado: [], // Sin artículos contado en esta solicitud
          credito: articulos.map((articulo: any) => {
            const processedItem: any = {
              codigo: articulo.codigo,
              nombre: articulo.nombre,
              ruta: articulo.ruta,
              imagen: articulo.imagen,
              cantidad: articulo.cantidad,
              precio: articulo.credito?.precio || articulo.precio,
              cuota: cuotas,
            };

            // Aplicar lógica de combo/promo para artículos de crédito
            // Si tiene combo pero no promo
            if (articulo.isCombo && !articulo.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }
            // Si tiene promo pero no combo
            else if (!articulo.isCombo && articulo.isPromo) {
              processedItem.is_combo = 0;
              processedItem.is_promo = 1;
              processedItem.id_promo = articulo.promoCodigo || null;
              processedItem.nombrePromo = articulo.promoNombre || null;
            }
            // Si tiene ambos
            else if (articulo.isCombo && articulo.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 1;
              processedItem.id_promo = articulo.promoCodigo || null;
              processedItem.nombrePromo = articulo.promoNombre || null;
            }
            // Si no tiene ninguno
            else {
              processedItem.is_combo = 0;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }

            return processedItem;
          }),
        };

        // const resultado = await this.insertarCarritos(nuevaSolicitud);
        // resultados.push({
        //   cuotas,
        //   success: resultado === 1,
        //   articulosCount: articulos.length,
        // });
      }

      const successCount = resultados.filter((r) => r.success).length;
      const totalCount = resultados.length;

      return {
        data: resultados,
        success: successCount === totalCount && totalCount > 0,
        message:
          totalCount > 0
            ? `${successCount}/${totalCount} solicitudes insertadas en Central App`
            : 'No hay artículos de crédito para procesar',
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: `ERROR AL INSERTAR EN CENTRAL APP: ${error.message}`,
      };
    }
  }
}
