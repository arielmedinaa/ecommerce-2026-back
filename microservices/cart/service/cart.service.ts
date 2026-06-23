import { Cart } from '@cart/schemas/cart.schemas';
import { Transaccion } from '@cart/schemas/transaccion.schemas';
import { Order } from '@cart/schemas/order.schemas';
import { OrderItem } from '@cart/schemas/order-item.schemas';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import {
  NEW_CART_INITIAL_STATE,
  NEW_SOLICITUD_INITIAL_STATE,
} from '@cart/constants/cart.constants';
import { UtilsCart } from '../utils/cart-utils';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { CartValidationService } from './cart.service.spec';
import { CartErrorService } from './errors/cart-error.service';

@Injectable()
export class CartContadoService {
  private readonly logger = new Logger(CartContadoService.name);
  private cartCache: Map<string, { data: Cart; timestamp: number }> = new Map();
  private readonly cacheTTL = 30 * 1000;

  constructor(
    @InjectRepository(Cart, 'WRITE_CONNECTION')
    private readonly carritoWrite: Repository<Cart>,
    @InjectRepository(Cart, 'READ_CONNECTION')
    private readonly carritoRead: Repository<Cart>,
    @InjectRepository(Transaccion, 'READ_CONNECTION')
    private readonly transaccionesRead: Repository<Transaccion>,
    @InjectRepository(Order, 'WRITE_CONNECTION')
    private readonly orderWrite: Repository<Order>,
    @InjectRepository(Order, 'READ_CONNECTION')
    private readonly orderRead: Repository<Order>,
    @InjectRepository(OrderItem, 'WRITE_CONNECTION')
    private readonly orderItemWrite: Repository<OrderItem>,
    @Inject('PRODUCTS_SERVICE')
    private readonly productsService: ClientProxy,
    @Inject('PAYMENTS_SERVICE') private readonly paymentsService: ClientProxy,
    @Inject('CONTENT_SERVICE') private readonly contentService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    private readonly cartValidationService: CartValidationService,
    private readonly cartErrorService: CartErrorService,
    private readonly resilientService: ResilientService,
    private readonly cacheService: CachePersistenteService,
    private readonly jwtService: JwtService,

    private readonly utilsCart: UtilsCart,
  ) {}

  async addCart(
    clienteToken: string,
    cuenta: string,
    codigo?: number,
    producto?: any,
    usuario_id?: number,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const decoded = this.jwtService.verify(clienteToken);
    usuario_id = parseInt(decoded.sub);
    if (isNaN(usuario_id) || !usuario_id) {
      this.logger.error('Invalid user ID from JWT token', { sub: decoded.sub, parsed: usuario_id });
      return {
        data: [],
        success: false,
        message: 'TOKEN DE USUARIO INVÁLIDO: ID DE USUARIO NO VÁLIDO',
      };
    }

    const clienteData = this.utilsCart.buildClienteFromToken(
      decoded,
      clienteToken,
      cuenta,
    );

    const validation = await this.cartValidationService.validateCartPayload(
      clienteToken,
      cuenta,
      codigo,
      producto,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    let eventoValidation: any = { allowed: true };
    try {
      eventoValidation = await firstValueFrom(
        this.contentService.send(
          { cmd: 'validarProductoParaCarrito' },
          {
            producto_codigo: producto.codigo,
            cliente_id: usuario_id?.toString() || clienteToken,
            usuario: {
              token: clienteToken,
              id: usuario_id,
              sub: usuario_id?.toString(),
            },
          },
        ),
      );
      if (!eventoValidation.allowed) {
        return {
          data: [],
          success: false,
          message:
            eventoValidation.reason ||
            'Producto no puede ser añadido al carrito debido a restricciones de evento.',
        };
      }
      if (eventoValidation.precioOferta && eventoValidation.precioOferta > 0) {
        producto.precio = eventoValidation.precioOferta;
        if (producto.credito) {
          producto.credito.precio = eventoValidation.precioOferta;
        }
      }
    } catch (error) {
      this.logger.warn(
        'Error al validar evento, permitiendo añadir producto',
        error,
      );
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
    let carritoExistente = await this.carritoRead
      .createQueryBuilder('cart')
      .where(
        "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario",
        {
          id_usuario: usuario_id,
        },
      )
      .andWhere(
        codigo === 0 ? 'cart.estado = :estado' : 'cart.codigo = :codigo',
        codigo === 0 ? { estado: '1' } : { codigo },
      )
      .orderBy('cart.codigo', 'DESC')
      .getOne();

    if (carritoExistente) {
      carritoExistente = await this.carritoRead.findOne({
        where: { id: carritoExistente.id },
      });
    }

    // Verificar límite de compra por producto (si hay límite en evento)
    if (eventoValidation.limite && eventoValidation.limite > 0) {
      let cantidadActualEnCarrito = 0;
      if (carritoExistente && carritoExistente.articulos) {
        const contado = carritoExistente.articulos.contado || [];
        const credito = carritoExistente.articulos.credito || [];
        const allArticulos = [...contado, ...credito];

        // Buscar el mismo producto (mismo código, mismo tipo de venta)
        const productosExistentes = allArticulos.filter((item: any) => {
          if (articuloTipo === 'credito') {
            return (
              String(item.codigo) === String(producto.codigo) && item.credito
            );
          } else {
            return (
              String(item.codigo) === String(producto.codigo) && !item.credito
            );
          }
        });

        cantidadActualEnCarrito = productosExistentes.reduce(
          (sum, item) => sum + (item.cantidad || 1),
          0,
        );
      }

      const cantidadNueva = producto.cantidad || 1;
      if (cantidadActualEnCarrito + cantidadNueva > eventoValidation.limite) {
        return {
          data: [],
          success: false,
          message: `Límite de compra alcanzado para este producto. Máximo permitido: ${eventoValidation.limite} unidades. Ya tienes ${cantidadActualEnCarrito} en tu carrito.`,
        };
      }
    }

    if (
      eventoValidation.condiciones &&
      eventoValidation.condiciones.length > 0
    ) {
      for (const condicion of eventoValidation.condiciones) {
        if (condicion.tipo === 'MIN_CARRITO') {
          const montoMinimo = parseFloat(condicion.valor);
          if (isNaN(montoMinimo) || montoMinimo <= 0) continue;

          // Calcular monto total del carrito actual (sin el nuevo producto)
          let montoActual = 0;
          if (carritoExistente && carritoExistente.articulos) {
            const contado = carritoExistente.articulos.contado || [];
            const credito = carritoExistente.articulos.credito || [];
            montoActual = [...contado, ...credito].reduce(
              (sum, item) => sum + item.precio * (item.cantidad || 1),
              0,
            );
          }
          // Sumar precio del nuevo producto (ya con precioOferta si aplica)
          montoActual += producto.precio * (producto.cantidad || 1);

          if (montoActual < montoMinimo) {
            return {
              data: [],
              success: false,
              message: `El monto mínimo del carrito debe ser ${montoMinimo}. Monto actual: ${montoActual}.`,
            };
          }
        } else if (condicion.tipo === 'MAX_UNIDADES_PEDIDO') {
          const maxUnidades = parseInt(condicion.valor);
          if (isNaN(maxUnidades) || maxUnidades <= 0) continue;

          // Calcular total de unidades en carrito actual
          let unidadesActuales = 0;
          if (carritoExistente && carritoExistente.articulos) {
            const contado = carritoExistente.articulos.contado || [];
            const credito = carritoExistente.articulos.credito || [];
            unidadesActuales = [...contado, ...credito].reduce(
              (sum, item) => sum + (item.cantidad || 1),
              0,
            );
          }
          // Sumar unidades del nuevo producto
          unidadesActuales += producto.cantidad || 1;

          if (unidadesActuales > maxUnidades) {
            return {
              data: [],
              success: false,
              message: `El máximo de unidades por pedido es ${maxUnidades}. Unidades actuales: ${unidadesActuales}.`,
            };
          }
        }
        // METODO_PAGO_ESPECIFICO se validará al finalizar compra
      }
    }

    if (!carritoExistente && codigo === 0) {
      const maxCodigo = await this.carritoRead
        .createQueryBuilder('cart')
        .select('MAX(cart.codigo)', 'max')
        .getRawOne();
      const nuevoCodigo = (maxCodigo?.max || 0) + 1;
      const nuevoCarrito = this.carritoWrite.create({
        ...NEW_CART_INITIAL_STATE(
          nuevoCodigo,
          clienteToken,
          cuenta,
          usuario_id,
          clienteData,
        ),
        articulos: {
          [articuloTipo]: [producto],
          [articuloTipo === 'credito' ? 'contado' : 'credito']: [],
        },
        estado: '1',
      });
      await this.carritoWrite.save(nuevoCarrito);

      carritoExistente = await this.carritoRead.findOne({
        where: { id: nuevoCarrito.id },
        order: { codigo: 'DESC' },
      });

      return {
        data: [carritoExistente],
        success: true,
        message: 'CARRITO CREADO CON ÉXITO',
      };
    }

    if (carritoExistente.proceso) {
      await this.transaccionesRead
        .createQueryBuilder()
        .update(Transaccion)
        .set({ estado: 0 })
        .where('codigo = :codigo AND estado = :estado', {
          codigo: carritoExistente.codigo,
          estado: 1,
        })
        .execute();
      await this.carritoWrite.update(carritoExistente.id, { proceso: '' });
    }

    const buscarProductoConMismasCondiciones = (
      carrito: any,
      producto: any,
      tipo: string,
    ) => {
      if (!carrito.articulos || !carrito.articulos[tipo]) {
        return null;
      }

      const productosMismoCodigo = carrito.articulos[tipo].filter(
        (articulo: any) => String(articulo.codigo) === String(producto.codigo),
      );

      if (tipo === 'credito') {
        const encontrado = productosMismoCodigo.find(
          (articulo: any) =>
            articulo.credito?.cuota === producto.credito?.cuota &&
            articulo.credito?.precio === producto.credito?.precio,
        );
        return encontrado;
      }

      const encontrado = productosMismoCodigo.find(
        (articulo: any) => !articulo.credito,
      );
      return encontrado;
    };

    const actualizarCantidadProducto = (
      carrito: any,
      producto: any,
      tipo: string,
    ) => {
      if (!carrito.articulos || !carrito.articulos[tipo]) {
        return;
      }

      carrito.articulos[tipo] = carrito.articulos[tipo].map((articulo: any) => {
        if (tipo === 'credito') {
          return String(articulo.codigo) === String(producto.codigo) &&
            articulo.credito?.cuota === producto.credito?.cuota &&
            articulo.credito?.precio === producto.credito?.precio
            ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
            : articulo;
        } else {
          return String(articulo.codigo) === String(producto.codigo) &&
            !articulo.credito
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
    } else {
      agregarNuevoProducto(carritoExistente, producto, articuloTipo);
    }

    const articulosUnicos = this.utilsCart.eliminarDuplicados(
      carritoExistente.articulos[articuloTipo],
      articuloTipo,
    );
    carritoExistente.articulos[articuloTipo] = articulosUnicos;
    carritoExistente.cliente = this.utilsCart.buildClienteFromToken(
      decoded,
      clienteToken,
      cuenta,
      carritoExistente.cliente,
    );

    await this.carritoWrite.save(carritoExistente);

    return {
      data: [carritoExistente],
      success: true,
      message: 'PRODUCTO AGREGADO AL CARRITO',
    };
  }

  // ¿El usuario tuvo movimientos de carrito en los últimos 30 días?
  // (cualquier carrito suyo actualizado en ese período: abierto, abandonado o finalizado).
  async userHasMovements(userId: number | string): Promise<{ hasMovements: boolean; count: number; success: boolean }> {
    try {
      const count = await this.carritoRead
        .createQueryBuilder('cart')
        .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id", { id: String(userId) })
        .andWhere('cart.updatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
        .getCount();
      return { hasMovements: count > 0, count, success: true };
    } catch (error) {
      this.logger.error('Error en userHasMovements:', error);
      return { hasMovements: false, count: 0, success: false };
    }
  }

  // Carrito activo (estado '1') del usuario del token. Helper para remove/clear.
  private async getCarritoActivoDeToken(clienteToken: string): Promise<Cart | null> {
    const decoded = this.jwtService.verify(clienteToken);
    const usuario_id = parseInt(decoded.sub);
    if (isNaN(usuario_id)) return null;
    const ref = await this.carritoRead
      .createQueryBuilder('cart')
      .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id", { id: usuario_id })
      .andWhere("cart.estado = '1'")
      .orderBy('cart.codigo', 'DESC')
      .getOne();
    if (!ref) return null;
    return this.carritoWrite.findOne({ where: { id: ref.id } });
  }

  // Quita un ítem del carrito activo (por código de producto; tipo opcional contado/credito).
  async removeCartItem(
    clienteToken: string,
    productoCodigo: string | number,
    tipo?: 'contado' | 'credito',
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const carrito = await this.getCarritoActivoDeToken(clienteToken);
      if (!carrito) return { data: [], success: false, message: 'NO HAY CARRITO ACTIVO' };
      const art: any = carrito.articulos || { contado: [], credito: [] };
      const tipos = tipo ? [tipo] : ['contado', 'credito'];
      for (const t of tipos) {
        art[t] = (art[t] || []).filter((i: any) => String(i.codigo) !== String(productoCodigo));
      }
      carrito.articulos = art;
      await this.carritoWrite.save(carrito);
      return { data: [carrito], success: true, message: 'ITEM REMOVIDO DEL CARRITO' };
    } catch (error) {
      this.logger.error('Error al remover ítem del carrito:', error);
      return { data: [], success: false, message: 'ERROR AL REMOVER ÍTEM' };
    }
  }

  // Quita varios ítems del carrito activo en UNA sola lectura-modificación-escritura.
  // Evita la condición de carrera de disparar N removeCartItem en paralelo
  // (cada uno leía el carrito completo y el último save pisaba a los demás).
  async removeCartItems(
    clienteToken: string,
    items: Array<{ codigo: string | number; tipo?: 'contado' | 'credito' }>,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const carrito = await this.getCarritoActivoDeToken(clienteToken);
      if (!carrito) return { data: [], success: false, message: 'NO HAY CARRITO ACTIVO' };
      const art: any = carrito.articulos || { contado: [], credito: [] };
      const lista = Array.isArray(items) ? items : [];
      for (const it of lista) {
        const tipos = it?.tipo ? [it.tipo] : ['contado', 'credito'];
        for (const t of tipos) {
          art[t] = (art[t] || []).filter((i: any) => String(i.codigo) !== String(it.codigo));
        }
      }
      carrito.articulos = art;
      await this.carritoWrite.save(carrito);
      return { data: [carrito], success: true, message: 'ITEMS REMOVIDOS DEL CARRITO' };
    } catch (error) {
      this.logger.error('Error al remover ítems del carrito:', error);
      return { data: [], success: false, message: 'ERROR AL REMOVER ÍTEMS' };
    }
  }

  // Setea la cantidad de un ítem del carrito activo (si <=0, lo quita).
  async setCartItemQty(
    clienteToken: string,
    productoCodigo: string | number,
    cantidad: number,
    tipo?: 'contado' | 'credito',
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const carrito = await this.getCarritoActivoDeToken(clienteToken);
      if (!carrito) return { data: [], success: false, message: 'NO HAY CARRITO ACTIVO' };
      const qty = Number(cantidad);
      const art: any = carrito.articulos || { contado: [], credito: [] };
      const tipos = tipo ? [tipo] : ['contado', 'credito'];
      for (const t of tipos) {
        const list = Array.isArray(art[t]) ? art[t] : [];
        if (qty <= 0) {
          art[t] = list.filter((i: any) => String(i.codigo) !== String(productoCodigo));
        } else {
          art[t] = list.map((i: any) =>
            String(i.codigo) === String(productoCodigo) ? { ...i, cantidad: qty } : i,
          );
        }
      }
      carrito.articulos = art;
      await this.carritoWrite.save(carrito);
      return { data: [carrito], success: true, message: 'CANTIDAD ACTUALIZADA' };
    } catch (error) {
      this.logger.error('Error al actualizar cantidad del ítem:', error);
      return { data: [], success: false, message: 'ERROR AL ACTUALIZAR CANTIDAD' };
    }
  }

  // Vacía el carrito activo del usuario (deja articulos en blanco, estado '1').
  async clearCart(clienteToken: string): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const carrito = await this.getCarritoActivoDeToken(clienteToken);
      if (!carrito) return { data: [], success: false, message: 'NO HAY CARRITO ACTIVO' };
      carrito.articulos = { contado: [], credito: [] } as any;
      await this.carritoWrite.save(carrito);
      return { data: [carrito], success: true, message: 'CARRITO VACIADO' };
    } catch (error) {
      this.logger.error('Error al vaciar el carrito:', error);
      return { data: [], success: false, message: 'ERROR AL VACIAR CARRITO' };
    }
  }

  // Mergea el carrito del invitado (por email) en el carrito activo del usuario logueado.
  // Mueve los artículos y cierra el carrito del invitado para evitar duplicados.
  async mergeGuestCart(
    userToken: string,
    guestEmail: string,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const destino = await this.getCarritoActivoDeToken(userToken);
      const guestCartRef = await this.carritoRead
        .createQueryBuilder('cart')
        .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.correo')) = :correo", { correo: guestEmail })
        .andWhere("cart.estado = '1'")
        .orderBy('cart.codigo', 'DESC')
        .getOne();
      if (!guestCartRef) return { data: destino ? [destino] : [], success: true, message: 'SIN CARRITO INVITADO' };
      const guestCart = await this.carritoWrite.findOne({ where: { id: guestCartRef.id } });
      const gArt: any = guestCart?.articulos || { contado: [], credito: [] };

      // Si el usuario no tiene carrito activo, simplemente reasignamos el del invitado.
      const decoded = this.jwtService.verify(userToken);
      const usuario_id = parseInt(decoded.sub);
      if (!destino) {
        guestCart.cliente = { ...(guestCart.cliente as any), id_usuario: usuario_id, equipo: userToken, correo: decoded.email };
        await this.carritoWrite.save(guestCart);
        return { data: [guestCart], success: true, message: 'CARRITO INVITADO REASIGNADO' };
      }

      // Fusionar artículos (sumando cantidades por codigo+tipo).
      const dArt: any = destino.articulos || { contado: [], credito: [] };
      for (const t of ['contado', 'credito']) {
        const destList = Array.isArray(dArt[t]) ? dArt[t] : [];
        for (const gi of gArt[t] || []) {
          const ex = destList.find((x: any) => String(x.codigo) === String(gi.codigo));
          if (ex) ex.cantidad = (Number(ex.cantidad) || 1) + (Number(gi.cantidad) || 1);
          else destList.push(gi);
        }
        dArt[t] = destList;
      }
      destino.articulos = dArt;
      await this.carritoWrite.save(destino);
      // Cerrar el carrito del invitado.
      guestCart.estado = '0';
      await this.carritoWrite.save(guestCart);
      return { data: [destino], success: true, message: 'CARRITO INVITADO FUSIONADO' };
    } catch (error) {
      this.logger.error('Error al mergear carrito de invitado:', error);
      return { data: [], success: false, message: 'ERROR AL FUSIONAR CARRITO' };
    }
  }

  async getCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: number,
  ): Promise<{ data: Record<string, any>; success: boolean; message: string }> {
    const cacheKey = `cart_${clienteToken}_${cuenta}_${codigo}`;
    const now = Date.now();
    const cached = this.cartCache.get(cacheKey);
    const decoded = this.jwtService.verify(clienteToken);

    if (cached && now - cached.timestamp < this.cacheTTL) {
      return {
        data: cached.data,
        success: true,
        message: 'Carrito recuperado',
      };
    }

    const resultado = await this.carritoRead
      .createQueryBuilder('cart')
      .where(
        "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario OR JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.correo')) = :correo",
        { id_usuario: decoded?.sub, correo: cuenta },
      )
      .andWhere(
        codigo === 0 ? 'cart.estado = :estado' : 'cart.codigo = :codigo',
        codigo === 0 ? { estado: '1' } : { codigo },
      )
      .orderBy('cart.codigo', 'DESC')
      .getOne();
    if (!resultado) {
      return { data: [], success: false, message: 'Su carrito está vacío' };
    }

    const articulosRaw = [...(resultado.articulos?.contado || [])];
    const codigos = [...new Set(articulosRaw.map((a) => String(a.codigo)))];
    const productsCacheKey = `cart_products_${codigos.join('_')}`;

    try {
      const [productos]: any = await this.cacheService.getWithFallback(
        productsCacheKey,
        async () => {
          return await Promise.all([
            this.resilientService.sendWithResilience(
              this.productsService,
              { cmd: 'get_products' },
              {
                ids: codigos,
                fields: 'codigo,marca,categorias,subcategorias,promos',
              },
              {
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
              },
            ),
          ]);
        },
        this.cacheTTL,
      );

      const enriquecerArticulos = (lista: any[]) => {
        return lista.map((art) => {
          const p = productos.find(
            (ip: any) => ip.codigo === String(art.codigo),
          );

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
        data: {
          codigo: resultado.codigo,
          articulos: resultado.articulos,
        },
        success: true,
        message: 'Carrito recuperado',
      };
    } catch (error) {
      return {
        data: {
          codigo: resultado.codigo,
          articulos: resultado.articulos,
        },
        success: true,
        message: 'Carrito recuperado (sin información adicional de productos)',
      };
    } finally {
      this.cartCache.set(cacheKey, {
        data: resultado,
        timestamp: now,
      });
    }
  }

  async getCartByCode(codigo: number) {
    return this.carritoRead.findOne({ where: { codigo } });
  }

  async getAllCart(
    clienteToken: string,
    limit: number,
    skip: number,
    sort: string,
    order: string = 'desc',
    estado: number = 0,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const resultado = await this.carritoRead
      .createQueryBuilder('cart')
      .where(
        "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario",
        {
          id_usuario: this.jwtService.decode(clienteToken)?.sub,
        },
      )
      .orderBy(`cart.${sort}`, order === 'desc' ? 'DESC' : 'ASC')
      .limit(limit)
      .skip(skip)
      .getMany();

    if (!resultado) {
      return {
        data: [],
        success: false,
        message: 'NO SE ENCONTRARON CARRITOS DE ESTE USUARIO',
      };
    }

    const carritosConEstado = await Promise.all(
      resultado.map(async (carrito) => {
        const estadoEcont = await this.utilsCart.getEstadoSolicitudEcont(
          carrito.codigo,
        );
        return {
          ...carrito,
          estadoSolicitud: estadoEcont,
        };
      }),
    );

    return {
      data: carritosConEstado,
      success: true,
      message: 'Carritos recuperados',
    };
  }

  async getCartsByUserId(
    userId: number | string,
    estado?: string,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const qb = this.carritoRead
        .createQueryBuilder('cart')
        .where(
          "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario",
          { id_usuario: String(userId) },
        )
        // Antigüedad calculada con el reloj de la BD (evita desfases de timezone en JS).
        .addSelect(
          'TIMESTAMPDIFF(MINUTE, COALESCE(cart.updatedAt, cart.createdAt), NOW())',
          'age_min',
        );
      if (estado !== undefined && estado !== null && estado !== '') {
        qb.andWhere('cart.estado = :estado', { estado: String(estado) });
      }
      const { entities, raw } = await qb.orderBy('cart.codigo', 'DESC').getRawAndEntities();
      const ABANDONO_MIN = 20; // un carrito no finalizado sin actividad > 20 min = abandonado
      const enriched = (entities || []).map((c: any, i: number) => {
        const ageMin = Number(raw?.[i]?.age_min ?? 0);
        const finalizado = c?.estado === '0' || c?.finished === '1';
        const abandonado = !finalizado && ageMin > ABANDONO_MIN;
        const situacion = finalizado ? 'finalizado' : abandonado ? 'abandonado' : 'activo';
        return { ...c, abandonado, situacion, ageMin };
      });
      return {
        data: enriched,
        success: true,
        message: 'CARRITOS DEL CLIENTE RECUPERADOS',
      };
    } catch (error) {
      this.logger.error('Error al obtener carritos por usuario:', error);
      return { data: [], success: false, message: 'ERROR AL OBTENER CARRITOS DEL CLIENTE' };
    }
  }

  async getComprasResumenByUsers(
    userIds: (number | string)[],
  ): Promise<{ data: Array<{ userId: string; compras: number; gastoTotal: number }>; success: boolean; message: string }> {
    try {
      const ids = (Array.isArray(userIds) ? userIds : [])
        .map((x) => String(x))
        .filter((x) => x && x !== 'null' && x !== 'undefined');
      // ids vacío => resumen de TODOS los usuarios con compras finalizadas (para el filtro por tipo).

      const qb = this.carritoRead
        .createQueryBuilder('cart')
        .select("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario'))", 'userId')
        .addSelect('COUNT(*)', 'compras')
        .addSelect(
          "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(cart.pago, '$.monto')) AS DECIMAL(14,2))), 0)",
          'gasto',
        )
        .where('cart.estado = :estado', { estado: '0' });
      if (ids.length > 0) {
        qb.andWhere("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) IN (:...ids)", { ids });
      }
      const rows = await qb.groupBy('userId').getRawMany();

      const data = (rows || []).map((r: any) => ({
        userId: String(r.userId),
        compras: Number(r.compras) || 0,
        gastoTotal: Number(r.gasto) || 0,
      }));
      return { data, success: true, message: 'RESUMEN DE COMPRAS' };
    } catch (error) {
      this.logger.error('Error al obtener resumen de compras por usuario:', error);
      return { data: [], success: false, message: 'ERROR AL OBTENER RESUMEN DE COMPRAS' };
    }
  }

  async getMissingCart(
    limit: number,
    skip: number,
    sort: string,
    order: 'asc' | 'desc' = 'desc',
  ): Promise<{
    data: Cart[];
    success: boolean;
    message: string;
  }> {
    const cacheKey = `missing-cart-${'administrador'}-${limit}-${skip}-${sort}-${order}-${1}`;
    const now = Date.now();
    const cached = this.cartCache.get(cacheKey);

    if (cached && now - cached.timestamp < this.cacheTTL) {
      return {
        data: [cached.data],
        success: true,
        message: 'CARRITOS RECUPERADOS POR CACHE',
      };
    }

    let resultado: Cart | any = [];
    try {
      resultado = await this.carritoRead
        .createQueryBuilder('cart')
        .where('cart.estado = :estado', { estado: '1' })
        .select([
          'cart.codigo',
          'cart.estado',
          'cart.articulos',
          'cart.seguimiento',
          'cart.cliente',
        ])
        .orderBy('cart.codigo', order as 'ASC' | 'DESC')
        .getMany();
      if (!resultado || resultado.length === 0) {
        return {
          data: [],
          success: false,
          message: 'No se encontraron carritos',
        };
      }
    } catch (error) {
      this.logger.error('Error al obtener carrito faltante:', error);
      return {
        data: [error],
        success: false,
        message: 'Error al obtener carrito faltante',
      };
    } finally {
      this.cartCache.set(cacheKey, {
        data: resultado,
        timestamp: Date.now(),
      });
    }
    return {
      data: resultado,
      success: true,
      message: 'Carrito faltante recuperado',
    };
  }

  async getCartByProduct(
    filters: any,
  ): Promise<{
    data: Cart[];
    message: string;
    total: number;
    success: boolean;
  }> {
    try {
      const limit = Number(filters.limit) || 10;
      const offset = Number(filters.offset) || 0;
      if (!filters.codigo) {
        return {
          data: [],
          total: 0,
          message: 'El código del producto es requerido'.toUpperCase(),
          success: false,
        };
      }

      const query = this.carritoRead
        .createQueryBuilder('cart')
        .where('cart.estado = :estado', { estado: filters.estado || 1 })
        .andWhere("(cart.finished IS NULL OR cart.finished = '')")
        .andWhere("(cart.proceso IS NULL OR cart.proceso = '')")
        .andWhere(
          "JSON_CONTAINS(cart.articulos, :codigo, '$.contado[*].codigo')",
          {
            codigo: `"${filters.codigo}"`,
          },
        )
        .orderBy('cart.createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const [carritos, total] = await query.getManyAndCount();
      if (total === 0) {
        const queryLike = this.carritoRead
          .createQueryBuilder('cart')
          .where('cart.estado = :estado', { estado: filters.estado || 1 })
          .andWhere("(cart.finished IS NULL OR cart.finished = '')")
          .andWhere("(cart.proceso IS NULL OR cart.proceso = '')")
          .andWhere('cart.articulos LIKE :codigo', {
            codigo: `%"codigo":${filters.codigo}%`,
          })
          .orderBy('cart.createdAt', 'DESC')
          .limit(limit)
          .offset(offset);

        const [carritosLike, totalLike] = await queryLike.getManyAndCount();
        return {
          data: carritosLike,
          total: totalLike,
          message:
            `Se encontraron ${totalLike} carritos abandonados para el producto ${filters.codigo}`.toUpperCase(),
          success: true,
        };
      }
      return {
        data: carritos,
        total,
        message:
          `Se encontraron ${total} carritos abandonados para el producto ${filters.codigo}`.toUpperCase(),
        success: true,
      };
    } catch (error) {
      this.logger.error(
        'Error al obtener carritos abandonados por producto:',
        error,
      );
      return {
        data: [],
        total: 0,
        message: 'Error al obtener carritos abandonados por producto',
        success: false,
      };
    }
  }

  async getCartWithoutToken(
    filters: any,
  ): Promise<{
    data: any;
    message: string;
    success: boolean;
    totalCarritos: number;
    totalCarritosFinalizados: number;
    totalAbandonados: number;
  }> {
    const limit = Number(filters?.limit ?? 10);
    const offset = Number(filters?.offset ?? 0);

    const where: any = {};
    const desdeRaw = filters?.desde;
    const hastaRaw = filters?.hasta;

    const desde = desdeRaw ? new Date(desdeRaw) : null;
    const hasta = hastaRaw ? new Date(hastaRaw) : null;

    const hasDesde = !!(desde && !Number.isNaN(desde.getTime()));
    const hasHasta = !!(hasta && !Number.isNaN(hasta.getTime()));

    if (hasDesde && hasHasta) where.createdAt = Between(desde as Date, hasta as Date);
    else if (hasDesde) where.createdAt = MoreThanOrEqual(desde as Date);
    else if (hasHasta) where.createdAt = LessThanOrEqual(hasta as Date);

    const carritos = await this.carritoRead.find({
      where,
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    const carritosFinalizados = await this.carritoRead.find({
      where: {
        estado: '0',
        finished: '1',
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    const carritosAbandonados = await this.carritoRead.find({
      where: {
        estado: '1',
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
    return {
      data: {
        carritos,
        carritosAbandonados,
        carritosFinalizados
      },
      message: 'Carrito obtenido exitosamente',
      success: true,
      totalCarritos: carritos.length,
      totalCarritosFinalizados: carritosFinalizados.length,
      totalAbandonados: carritosAbandonados.length,
    };
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
    const decoded = this.jwtService.verify(clienteToken);
    const usuario_id = parseInt(decoded.sub);
    if (isNaN(usuario_id) || !usuario_id) {
      this.logger.error('Invalid user ID from JWT token in finishCart', { sub: decoded.sub, parsed: usuario_id });
      return {
        data: [],
        success: false,
        message: 'TOKEN DE USUARIO INVÁLIDO: ID DE USUARIO NO VÁLIDO',
      };
    }
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

    const carrito = await this.carritoRead
      .createQueryBuilder('cart')
      .where(
        "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario AND cart.codigo = :codigo AND cart.estado != :estado",
        {
          id_usuario: this.jwtService.decode(clienteToken)?.sub,
          codigo,
          estado: '0',
        },
      )
      .getOne();
    if (!carrito) {
      const error = new Error(
        'CARRITO NO ENCONTRADO O CON POSIBLE PAGO CONFIRMADO',
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
      const clientePersistido = this.utilsCart.buildClienteFromToken(
        decoded,
        clienteToken,
        cuenta,
        {
          ...carrito.cliente,
          ...process.cliente,
        },
      );

      this.logger.log('Registrando pago en payments service');
      const pagoResponse = await firstValueFrom(
        this.paymentsService.send(
          { cmd: 'registrar_pago' },
          {
            codigoCarrito: codigo,
            carrito: carrito,
            metodoPago: metodoPago,
            monto: montoTotal,
            moneda: process.moneda || 'PYG',
            cliente: clientePersistido,
            descripcion: descripcion,
            respuestaPagopar:
              metodoPago === 'pagopar' ? process.pagoparResponse || {} : {},
            respuestaBancard:
              metodoPago === 'bancard' ? process.bancardResponse || {} : {},
          },
        ),
      );

      await this.carritoWrite.update(carrito.id!, {
        pago: {
          ...process,
          pagoId: pagoResponse.data?.idTransaccion,
          intentoPagoId: pagoResponse.data?.idIntentoPago,
          registradoEnPayments: true,
        },
        estado: '0',
        finished: '1',
        cliente: clientePersistido,
        envio: process?.envio || {},
      });

      const orderItems: Partial<OrderItem>[] = [];
      const articulos = carrito.articulos || {};
      const contado = articulos.contado || [];
      const credito = articulos.credito || [];
      const allArticulos = [...contado, ...credito];

      for (const item of allArticulos) {
        let eventoId: number | null = null;
        try {
          const eventoResponse = await firstValueFrom(
            this.contentService.send(
              { cmd: 'obtenerEventoActivoParaProducto' },
              { producto_codigo: item.codigo },
            ),
          );
          if (eventoResponse && eventoResponse.id) {
            eventoId = eventoResponse.id;
          }
        } catch (error) {
          // Si no hay evento, ignorar
        }

        orderItems.push(
          this.orderItemWrite.create({
            producto_codigo: item.codigo,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.cantidad * item.precio,
            evento_id: eventoId,
          }),
        );
      }

      const order = this.orderWrite.create({
        codigo: `ORD-${codigo}-${Date.now()}`,
        carrito_codigo: carrito.codigo,
        cliente_documento: String(usuario_id),
        total: montoTotal,
        datos_envio: process?.envio || {},
        datos_pago: process,
        // Mantener consistencia con el sistema actual: las órdenes finalizadas
        // se registran con `estado = 0` (y el conteo de beneficios diarios usa ese valor).
        estado: 0,
      });

      const savedOrder = await this.orderWrite.save(order);
      for (const item of orderItems) {
        item.orden_id = savedOrder.id;
      }
      await this.orderItemWrite.save(orderItems);
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

      // Validar beneficios por cupones (compras diarias)
      setImmediate(async () => {
        try {
          await this.validateDailyPurchaseBenefits(usuario_id);
        } catch (benefitError) {
          console.error('Error al validar beneficios diarios:', benefitError);
        }
      });

      return {
        data: [pagoResponse.data],
        success: true,
        message: 'CARRITO FINALIZADO E INTENTO DE PAGO ENCOLADO',
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
      let datos = await this.carritoRead
        .createQueryBuilder('cart')
        .where(
          "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.equipo')) = :equipo AND cart.codigo = :codigo",
          { equipo: clienteToken, codigo },
        )
        .getOne();
      if (!datos) {
        return {
          data: [],
          success: false,
          message: 'Carrito no encontrado',
        };
      }

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

      const resultados: {
        cuotas: number;
        success: boolean;
        articulosCount: number;
      }[] = [];

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
          Number(datos.cliente?.id_usuario || 0),
          datos.cliente,
        );

        solicitudContado.cliente = {
          ...solicitudContado.cliente!,
          equipo:
            datos.cliente?.equipo ||
            solicitudContado.cliente?.equipo ||
            clienteToken,
        };
        solicitudContado.pago = datos.pago;
        solicitudContado.estado = datos.estado;
        solicitudContado.envio =
          solicitud['envio'] || datos.envio || solicitudContado.envio;
        solicitudContado.codigo = Number(codigo);

        solicitudContado.articulos = {
          contado: datos.articulos.contado.map((item: any) => {
            const processedItem: any = { ...item };
            if (item.isCombo && !item.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            } else if (!item.isCombo && item.isPromo) {
              processedItem.is_combo = 0;
              processedItem.is_promo = 1;
              processedItem.id_promo = item.promoCodigo || null;
              processedItem.nombrePromo = item.promoNombre || null;
            } else if (item.isCombo && item.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 1;
              processedItem.id_promo = item.promoCodigo || null;
              processedItem.nombrePromo = item.promoNombre || null;
            } else {
              processedItem.is_combo = 0;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }

            return processedItem;
          }),
          credito: [],
        };

        const resultadoContado =
          await this.utilsCart.insertarCarritos(solicitudContado);
        resultados.push({
          cuotas: 0,
          success: resultadoContado === 1,
          articulosCount: datos.articulos.contado.length,
        });
      }

      for (const [cuotas, articulos] of solicitudesPorCuota.entries()) {
        if (cuotas === 0) continue;

        const nuevaSolicitud = NEW_SOLICITUD_INITIAL_STATE(
          codigo!,
          clienteToken,
          cuenta || '',
          Number(datos.cliente?.id_usuario || 0),
          datos.cliente,
        );

        nuevaSolicitud.cliente = {
          ...nuevaSolicitud.cliente!,
          equipo:
            datos.cliente?.equipo ||
            nuevaSolicitud.cliente?.equipo ||
            clienteToken,
        };
        nuevaSolicitud.estado = datos.estado;
        nuevaSolicitud.pago = datos.pago;
        nuevaSolicitud.envio =
          solicitud['envio'] || datos.envio || nuevaSolicitud.envio;
        nuevaSolicitud.codigo = Number(codigo);

        nuevaSolicitud.articulos = {
          contado: [],
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

            if (articulo.isCombo && !articulo.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            } else if (!articulo.isCombo && articulo.isPromo) {
              processedItem.is_combo = 0;
              processedItem.is_promo = 1;
              processedItem.id_promo = articulo.promoCodigo || null;
              processedItem.nombrePromo = articulo.promoNombre || null;
            } else if (articulo.isCombo && articulo.isPromo) {
              processedItem.is_combo = 1;
              processedItem.is_promo = 1;
              processedItem.id_promo = articulo.promoCodigo || null;
              processedItem.nombrePromo = articulo.promoNombre || null;
            } else {
              processedItem.is_combo = 0;
              processedItem.is_promo = 0;
              processedItem.id_promo = null;
              processedItem.nombrePromo = null;
            }

            return processedItem;
          }),
        };

        const resultado = await this.utilsCart.insertarCarritos(nuevaSolicitud);
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

  async countDailyFinishedCarts(clienteDocumento: number): Promise<number> {
    try {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const orderCount = await this.orderRead
        .createQueryBuilder('order')
        .where('order.cliente_documento = :clienteDocumento', {
          clienteDocumento,
        })
        // En este proyecto las órdenes "finalizadas" se guardan con `estado = 0`
        // (ver datos reales). Este conteo alimenta los beneficios diarios.
        .andWhere('order.estado = 0')
        .andWhere('order.fecha_creacion BETWEEN :start AND :end', {
          start: todayStart,
          end: todayEnd,
        })
        .getCount();

      //this.logger.log(`Carritos finalizados del día para cliente ${clienteDocumento}: ${orderCount}`);
      return orderCount;
    } catch (error) {
      this.logger.error('Error al contar carritos finalizados del día:', error);
      return 0;
    }
  }

  async validateDailyPurchaseBenefits(clienteDocumento: number): Promise<void> {
    try {
      const dailyPurchases =
        await this.countDailyFinishedCarts(clienteDocumento);
      const benefitEventsResponse = await firstValueFrom(
        this.contentService.send(
          { cmd: 'getBenefitEvents' },
          {
            minPurchases: dailyPurchases,
            active: true,
          },
        ),
      );

      //this.logger.debug('Response Beneficios', benefitEventsResponse.data)
      if (!benefitEventsResponse || !benefitEventsResponse.data) {
        return;
      }

      const benefitEvents = benefitEventsResponse.data;
      for (const event of benefitEvents) {
        if (event.codigo && event.codigo.startsWith('B-')) {
          await this.generateCouponForUser(clienteDocumento, event);
        }
      }
    } catch (error) {
      this.logger.error('Error en validateDailyPurchaseBenefits:', error);
    }
  }

  async generateCouponForUser(
    clienteDocumento: number,
    event: any,
  ): Promise<void> {
    try {
      const userResponse = await firstValueFrom(
        this.authService.send(
          { cmd: 'getUserByDocument' },
          { documento: clienteDocumento },
        ),
      );

      if (!userResponse || !userResponse.data) {
        return;
      }

      const couponData = {
        userId: userResponse.data.id,
        idCupon: event.idCupon,
        descripcion: `Cupón por beneficio: ${event.nombre}`,
        eventId: event.codigo,
      };

      await firstValueFrom(
        this.authService.send({ cmd: 'createUserCoupon' }, couponData),
      );
    } catch (error) {
      this.logger.error('Error al generar cupón:', error);
    }
  }
}
