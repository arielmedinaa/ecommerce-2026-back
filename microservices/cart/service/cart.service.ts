import { Cart } from '@cart/schemas/cart.schemas';
import { Transaccion } from '@cart/schemas/transaccion.schemas';
import { Order } from '@cart/schemas/order.schemas';
import { OrderItem } from '@cart/schemas/order-item.schemas';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
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

const STOREFRONT_URL = process.env.STOREFRONT_URL;

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
    @Inject('MAIL_SERVICE') private readonly mailClient: ClientProxy,
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

    try {
      const promoInfo: Record<string, any> = await firstValueFrom(
        this.productsService.send(
          { cmd: 'get_promo_info_for_codigos' },
          { codigos: [producto.codigo] },
        ),
      );
      const promo = promoInfo?.[String(producto.codigo).trim()];
      if (promo) {
        if (promo.disponibleEcommerce !== null && promo.disponibleEcommerce !== undefined) {
          let cantidadActualEnCarritoPromo = 0;
          if (carritoExistente && carritoExistente.articulos) {
            const contado = carritoExistente.articulos.contado || [];
            const credito = carritoExistente.articulos.credito || [];
            cantidadActualEnCarritoPromo = [...contado, ...credito]
              .filter((item: any) => String(item.codigo) === String(producto.codigo))
              .reduce((sum, item) => sum + (item.cantidad || 1), 0);
          }
          const cantidadNuevaPromo = producto.cantidad || 1;
          if (cantidadActualEnCarritoPromo + cantidadNuevaPromo > promo.disponibleEcommerce) {
            return {
              data: [],
              success: false,
              message: `Stock de promoción agotado para este producto. Disponible: ${promo.disponibleEcommerce} unidades. Ya tienes ${cantidadActualEnCarritoPromo} en tu carrito.`,
            };
          }
        }

        if (promo.contado !== null && promo.contado !== undefined) {
          producto.precio = promo.contado;
          if (producto.credito) {
            const cuotaPromo = Array.isArray(promo.cuotas)
              ? promo.cuotas.find((c: any) => c.cuota === producto.credito.cuota)
              : null;
            producto.credito.precio = cuotaPromo ? cuotaPromo.precio : promo.contado;
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        'Error al validar stock de promoción, permitiendo añadir producto',
        error,
      );
    }

    if (eventoValidation.limite && eventoValidation.limite > 0) {
      let cantidadActualEnCarrito = 0;
      if (carritoExistente && carritoExistente.articulos) {
        const contado = carritoExistente.articulos.contado || [];
        const credito = carritoExistente.articulos.credito || [];
        const allArticulos = [...contado, ...credito];

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

          let montoActual = 0;
          if (carritoExistente && carritoExistente.articulos) {
            const contado = carritoExistente.articulos.contado || [];
            const credito = carritoExistente.articulos.credito || [];
            montoActual = [...contado, ...credito].reduce(
              (sum, item) => sum + item.precio * (item.cantidad || 1),
              0,
            );
          }
          
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

          let unidadesActuales = 0;
          if (carritoExistente && carritoExistente.articulos) {
            const contado = carritoExistente.articulos.contado || [];
            const credito = carritoExistente.articulos.credito || [];
            unidadesActuales = [...contado, ...credito].reduce(
              (sum, item) => sum + (item.cantidad || 1),
              0,
            );
          }
          
          unidadesActuales += producto.cantidad || 1;

          if (unidadesActuales > maxUnidades) {
            return {
              data: [],
              success: false,
              message: `El máximo de unidades por pedido es ${maxUnidades}. Unidades actuales: ${unidadesActuales}.`,
            };
          }
        }
        
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

  async countUserOrders(
    clienteDocumento: string,
    estado = 1,
  ): Promise<{ count: number; success: boolean }> {
    try {
      const count = await this.orderRead.count({
        where: { cliente_documento: clienteDocumento, estado },
      });
      return { count, success: true };
    } catch (error) {
      this.logger.error('Error en countUserOrders:', error);
      return { count: 0, success: false };
    }
  }

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

  async mergeGuestCart(
    userToken: string,
    guestEmail: string,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    try {
      const destino = await this.getCarritoActivoDeToken(userToken);
      const decoded = this.jwtService.verify(userToken);
      const usuario_id = parseInt(decoded.sub);

      const anyGuestCart = await this.carritoRead
        .createQueryBuilder('cart')
        .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.correo')) = :correo", { correo: guestEmail })
        .orderBy('cart.codigo', 'DESC')
        .getOne();
      const guestUserId = Number((anyGuestCart?.cliente as any)?.id_usuario);
      if (Number.isFinite(guestUserId) && guestUserId > 0 && guestUserId !== usuario_id) {
        
        await this.orderWrite
          .createQueryBuilder()
          .update()
          .set({ cliente_documento: String(usuario_id) })
          .where('cliente_documento = :g', { g: String(guestUserId) })
          .execute();

        const carritosInvitado = await this.carritoWrite
          .createQueryBuilder('cart')
          .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.correo')) = :correo", { correo: guestEmail })
          .andWhere("cart.estado = '0'")
          .getMany();
        for (const cInv of carritosInvitado) {
          cInv.cliente = this.utilsCart.buildClienteFromToken(
            decoded,
            userToken,
            decoded.email,
            cInv.cliente as any,
          );
          await this.carritoWrite.save(cInv);
        }
      }

      const guestCartRef = await this.carritoRead
        .createQueryBuilder('cart')
        .where("JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.correo')) = :correo", { correo: guestEmail })
        .andWhere("cart.estado = '1'")
        .orderBy('cart.codigo', 'DESC')
        .getOne();
      if (!guestCartRef) return { data: destino ? [destino] : [], success: true, message: 'ORDENES INVITADO ASOCIADAS' };
      const guestCart = await this.carritoWrite.findOne({ where: { id: guestCartRef.id } });
      const gArt: any = guestCart?.articulos || { contado: [], credito: [] };

      if (!destino) {

        guestCart.cliente = this.utilsCart.buildClienteFromToken(
          decoded,
          userToken,
          decoded.email,
          guestCart.cliente as any,
        );
        await this.carritoWrite.save(guestCart);
        return { data: [guestCart], success: true, message: 'CARRITO INVITADO REASIGNADO' };
      }

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
        
        .addSelect(
          'TIMESTAMPDIFF(MINUTE, COALESCE(cart.updatedAt, cart.createdAt), NOW())',
          'age_min',
        );
      if (estado !== undefined && estado !== null && estado !== '') {
        qb.andWhere('cart.estado = :estado', { estado: String(estado) });
      }
      const { entities, raw } = await qb.orderBy('cart.codigo', 'DESC').getRawAndEntities();
      const ABANDONO_MIN = 20; 
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

  async syncClienteByUser(
    userId: number | string,
    patch: { razonsocial?: string; correo?: string; telefono?: string; documento?: string },
  ): Promise<{ data: { actualizados: number }; success: boolean; message: string }> {
    try {
      const carritos = await this.carritoWrite
        .createQueryBuilder('cart')
        .where(
          "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id_usuario",
          { id_usuario: String(userId) },
        )
        .getMany();

      let actualizados = 0;
      for (const cart of carritos) {
        const cliente: any = { ...(cart.cliente as any) };
        if (patch.razonsocial != null && patch.razonsocial !== '') cliente.razonsocial = patch.razonsocial;
        if (patch.correo != null && patch.correo !== '') cliente.correo = patch.correo;
        if (patch.telefono != null && patch.telefono !== '') cliente.telefono = patch.telefono;
        if (patch.documento != null && patch.documento !== '') cliente.documento = patch.documento;
        cart.cliente = cliente;
        await this.carritoWrite.save(cart);
        actualizados++;
      }
      return { data: { actualizados }, success: true, message: 'CLIENTE SINCRONIZADO EN CARRITOS' };
    } catch (error) {
      this.logger.error('Error al sincronizar cliente en carritos:', error);
      return { data: { actualizados: 0 }, success: false, message: 'ERROR AL SINCRONIZAR CLIENTE' };
    }
  }

  async getComprasResumenByUsers(
    userIds: (number | string)[],
  ): Promise<{ data: Array<{ userId: string; compras: number; gastoTotal: number }>; success: boolean; message: string }> {
    try {
      const ids = (Array.isArray(userIds) ? userIds : [])
        .map((x) => String(x))
        .filter((x) => x && x !== 'null' && x !== 'undefined');

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

  async getUserTopCategorias(
    userId: number | string,
    limit = 5,
  ): Promise<{
    data: {
      marcas: Array<{ codigo: string; nombre: string | null; count: number }>;
      categorias: Array<{ nombre: string; count: number }>;
    };
    success: boolean;
    message: string;
  }> {
    const vacio = { marcas: [], categorias: [] };
    try {
      const id = String(userId ?? '').trim();
      if (!id || id === 'null' || id === 'undefined') {
        return { data: vacio, success: true, message: 'SIN USUARIO' };
      }

      const carritos = await this.carritoRead
        .createQueryBuilder('cart')
        .where('cart.estado = :estado', { estado: '0' })
        .andWhere(
          "JSON_UNQUOTE(JSON_EXTRACT(cart.cliente, '$.id_usuario')) = :id",
          { id },
        )
        .orderBy('cart.codigo', 'DESC')
        .limit(50)
        .getMany();

      const codigos = [
        ...new Set(
          carritos.flatMap((c) => [
            ...((c.articulos as any)?.contado || []),
            ...((c.articulos as any)?.credito || []),
          ].map((a: any) => String(a.codigo)).filter(Boolean)),
        ),
      ];

      if (codigos.length === 0) {
        return { data: vacio, success: true, message: 'SIN COMPRAS' };
      }

      const productos: any[] = await this.resilientService.sendWithResilience(
        this.productsService,
        { cmd: 'get_products' },
        { ids: codigos, fields: 'codigo,marca,categorias' },
        {
          retries: 2,
          delay: 800,
          fallback: async () => [],
          circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
        },
      );

      const marcaCount = new Map<string, { nombre: string | null; count: number }>();
      const catCount = new Map<string, number>();
      for (const p of productos || []) {
        const codigoMarca = p?.marca != null && String(p.marca).trim() ? String(p.marca).trim() : '';
        if (codigoMarca) {
          const prev = marcaCount.get(codigoMarca);
          const nombre = p?.nombre_marca ? String(p.nombre_marca).trim() : prev?.nombre ?? null;
          marcaCount.set(codigoMarca, { nombre, count: (prev?.count || 0) + 1 });
        }
        const cat = p?.categorias?.[0]?.nombre ? String(p.categorias[0].nombre).trim() : '';
        if (cat) catCount.set(cat, (catCount.get(cat) || 0) + 1);
      }

      const marcas = [...marcaCount.entries()]
        .map(([codigo, v]) => ({ codigo, nombre: v.nombre, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      const categorias = [...catCount.entries()]
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return {
        data: { marcas, categorias },
        success: true,
        message: 'TOP CATEGORIAS/MARCAS DEL USUARIO',
      };
    } catch (error) {
      this.logger.error('Error al obtener top categorías por usuario:', error);
      return { data: vacio, success: false, message: 'ERROR AL OBTENER TOP CATEGORIAS' };
    }
  }

  private readonly ORDER_EDIT_WINDOW_MIN = 20;

  async getUserOrders(
    userId: number | string,
  ): Promise<{ data: any[]; success: boolean; message: string }> {
    try {
      const id = String(userId ?? '').trim();
      if (!id || id === 'null' || id === 'undefined') {
        return { data: [], success: true, message: 'SIN USUARIO' };
      }

      const rows = await this.orderWrite
        .createQueryBuilder('orden')
        .select('orden.id', 'id')
        .addSelect('TIMESTAMPDIFF(MINUTE, orden.fecha_creacion, NOW())', 'minutos_desde_creacion')
        .where('orden.cliente_documento = :id', { id })
        .andWhere('orden.estado = :estado', { estado: 0 })
        .orderBy('orden.fecha_creacion', 'DESC')
        .take(50)
        .getRawMany();
      if (rows.length === 0) {
        return { data: [], success: true, message: 'SIN ORDENES' };
      }
      const orderIds = rows.map((r) => Number(r.id));
      const minutosByOrderId = new Map<number, number>(
        rows.map((r) => [Number(r.id), Number(r.minutos_desde_creacion ?? 0)]),
      );
      const ordersUnsorted = await this.orderWrite.find({
        where: { id: In(orderIds) },
        relations: { items: true },
      });
      const orderById = new Map(ordersUnsorted.map((o) => [o.id, o]));
      const orders = orderIds.map((oid) => orderById.get(oid)).filter(Boolean) as typeof ordersUnsorted;

      const codigos = [
        ...new Set(
          orders.flatMap((o) => (o.items || []).map((it) => String(it.producto_codigo))).filter(Boolean),
        ),
      ];
      const imgByCodigo = new Map<string, string | null>();
      if (codigos.length > 0) {
        try {
          const res: any = await this.resilientService.sendWithResilience(
            this.productsService,
            { cmd: 'get_products_by_codigos' },
            { codigos, limit: codigos.length },
            { retries: 2, delay: 800, fallback: async () => ({ data: [] }), circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } },
          );
          const data: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          for (const p of data) {
            const cod = String(p?.codigo_articulo ?? p?.codigo ?? '').trim();
            const img = Array.isArray(p?.imagenes) ? p.imagenes[0] : null;
            if (cod) imgByCodigo.set(cod, img || null);
          }
        } catch (e) {
          this.logger.warn(`No se pudieron enriquecer imágenes de órdenes: ${e}`);
        }
      }

      const data = orders.map((o) => {
        const minutos = minutosByOrderId.get(o.id) ?? 0;
        const envio: any = o.datos_envio || {};
        return {
          id: o.id,
          codigo: o.codigo,
          carritoCodigo: o.carrito_codigo,
          total: Number(o.total) || 0,
          estado: o.estado,
          fechaCreacion: o.fecha_creacion,
          cambios: Array.isArray(o.cambios) ? o.cambios : [],
          editable: minutos < this.ORDER_EDIT_WINDOW_MIN,
          minutosDesdeFinalizado: Math.floor(minutos),
          ventanaEdicionMin: this.ORDER_EDIT_WINDOW_MIN,
          envio: {
            retirar: !!envio.retirar,
            agendamiento: envio.agendamiento ?? null,
            horaAgendamiento: envio.horaAgendamiento ?? null,
            horarioDesde: envio.horarioDesde ?? null,
            horarioHasta: envio.horarioHasta ?? null,
            callePrincipal: envio.callePrincipal ?? envio.direccion ?? null,
            ciudad: envio.ciudad ?? envio.city ?? null,
          },
          articulos: (o.items || []).map((it) => ({
            codigo: it.producto_codigo,
            nombre: it.producto_nombre,
            cantidad: it.cantidad,
            precio: Number(it.precio_unitario) || 0,
            subtotal: Number(it.subtotal) || 0,
            imagen: imgByCodigo.get(String(it.producto_codigo)) ?? null,
          })),
        };
      });

      return { data, success: true, message: 'ORDENES DEL USUARIO' };
    } catch (error) {
      this.logger.error('Error al obtener órdenes del usuario:', error);
      return { data: [], success: false, message: 'ERROR AL OBTENER ORDENES' };
    }
  }

  async updateOrder(
    userId: number | string,
    codigo: string,
    patch: {
      agendamiento?: { fecha?: string; hora?: string; horarioDesde?: string; horarioHasta?: string };
      items?: Array<{ codigo: string | number; nombre: string; cantidad: number; precio: number }>;
    },
  ): Promise<{ data: any; success: boolean; message: string }> {
    try {
      const id = String(userId ?? '').trim();
      const order = await this.orderWrite.findOne({
        where: { codigo, cliente_documento: id, estado: 0 },
        relations: { items: true },
      });
      if (!order) {
        return { data: null, success: false, message: 'ORDEN NO ENCONTRADA' };
      }

      const minutos = (Date.now() - new Date(order.fecha_creacion).getTime()) / 60000;
      if (minutos >= this.ORDER_EDIT_WINDOW_MIN) {
        return {
          data: null,
          success: false,
          message: 'La orden ya no puede editarse (pasaron más de 20 minutos).',
        };
      }

      const carrito = await this.carritoWrite
        .createQueryBuilder('cart')
        .where('cart.codigo = :codigo', { codigo: order.carrito_codigo })
        .getOne();

      const cambios: any[] = Array.isArray(order.cambios) ? [...order.cambios] : [];
      const ahora = new Date().toISOString();

      if (patch.agendamiento) {
        const a = patch.agendamiento;
        const envioPrev: any = { ...(order.datos_envio || {}) };
        const envio: any = { ...envioPrev };
        if (a.fecha != null) envio.agendamiento = a.fecha;
        if (a.hora != null) envio.horaAgendamiento = a.hora;
        if (a.horarioDesde != null) envio.horarioDesde = a.horarioDesde;
        if (a.horarioHasta != null) envio.horarioHasta = a.horarioHasta;
        order.datos_envio = envio;
        if (carrito) carrito.envio = { ...(carrito.envio as any), ...envio };
        cambios.push({
          tipo: 'agendamiento',
          fecha: ahora,
          antes: {
            agendamiento: envioPrev.agendamiento ?? null,
            horaAgendamiento: envioPrev.horaAgendamiento ?? null,
            horarioDesde: envioPrev.horarioDesde ?? null,
            horarioHasta: envioPrev.horarioHasta ?? null,
          },
          despues: {
            agendamiento: envio.agendamiento ?? null,
            horaAgendamiento: envio.horaAgendamiento ?? null,
            horarioDesde: envio.horarioDesde ?? null,
            horarioHasta: envio.horarioHasta ?? null,
          },
          resumen: `Reprogramó la entrega${envio.horaAgendamiento ? ` a las ${envio.horaAgendamiento}` : ''}`,
        });
      }

      if (Array.isArray(patch.items) && patch.items.length > 0) {
        const nuevos = patch.items.map((it) => ({
          codigo: String(it.codigo),
          nombre: String(it.nombre ?? ''),
          cantidad: Number(it.cantidad) || 1,
          precio: Number(it.precio) || 0,
        }));

        const antesItems = (order.items || []).map((it) => ({
          codigo: it.producto_codigo,
          nombre: it.producto_nombre,
          cantidad: it.cantidad,
        }));

        await this.orderItemWrite.delete({ orden_id: order.id });
        const nuevosItems = nuevos.map((it) =>
          this.orderItemWrite.create({
            orden_id: order.id,
            producto_codigo: it.codigo,
            producto_nombre: it.nombre,
            cantidad: it.cantidad,
            precio_unitario: it.precio,
            subtotal: it.cantidad * it.precio,
            evento_id: null,
          }),
        );
        await this.orderItemWrite.save(nuevosItems);

        const total = nuevos.reduce((s, it) => s + it.cantidad * it.precio, 0);
        order.total = total;

        if (carrito) {
          const articulos: any = { ...(carrito.articulos as any) };
          articulos.contado = nuevos.map((it) => ({
            codigo: it.codigo,
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio: it.precio,
          }));
          carrito.articulos = articulos;
        }

        cambios.push({
          tipo: 'articulo',
          fecha: ahora,
          antes: antesItems,
          despues: nuevos.map((it) => ({ codigo: it.codigo, nombre: it.nombre, cantidad: it.cantidad })),
          resumen:
            antesItems.length === 0
              ? `Agregó: ${nuevos.map((n) => n.nombre).join(', ')}`
              : `Actualizó los artículos: ${nuevos.map((n) => n.nombre).join(', ')}`,
        });
      }

      order.cambios = cambios;
      await this.orderWrite.save(order);
      if (carrito) await this.carritoWrite.save(carrito);

      const clienteToken = (order.datos_pago as any)?.cliente?.equipo || (carrito?.cliente as any)?.equipo;
      if (clienteToken) {
        setImmediate(async () => {
          try {
            await this.insertarSolicitudesCentralApp({}, clienteToken, '', order.carrito_codigo);
          } catch (e) {
            this.logger.error('Error al re-enviar solicitud a CentralApp tras editar orden:', e as any);
          }
        });
      }

      const [refreshed] = (await this.getUserOrders(id)).data.filter((o: any) => o.codigo === codigo);
      return { data: refreshed ?? null, success: true, message: 'ORDEN ACTUALIZADA' };
    } catch (error) {
      this.logger.error('Error al actualizar orden:', error);
      return { data: null, success: false, message: 'ERROR AL ACTUALIZAR ORDEN' };
    }
  }

  async rateOrder(
    userId: number | string,
    codigo: string,
    body: { estrellas: number; motivos?: string[]; comentario?: string },
  ): Promise<{ data: any; success: boolean; message: string }> {
    try {
      const id = String(userId ?? '').trim();
      const estrellas = Number(body?.estrellas);
      if (!Number.isFinite(estrellas) || estrellas < 1 || estrellas > 5) {
        return { data: null, success: false, message: 'CALIFICACION INVALIDA' };
      }

      const order = await this.orderWrite.findOne({ where: { codigo, cliente_documento: id } });
      if (!order) {
        return { data: null, success: false, message: 'ORDEN NO ENCONTRADA' };
      }
      if (order.calificacion) {
        return { data: order.calificacion, success: false, message: 'LA ORDEN YA FUE CALIFICADA' };
      }

      order.calificacion = {
        estrellas,
        motivos: estrellas <= 3 && Array.isArray(body?.motivos) ? body.motivos.filter(Boolean) : undefined,
        comentario: estrellas <= 3 ? (body?.comentario || undefined) : undefined,
        fecha: new Date().toISOString(),
      };
      await this.orderWrite.save(order);

      return { data: order.calificacion, success: true, message: 'CALIFICACION REGISTRADA' };
    } catch (error) {
      this.logger.error('Error al calificar orden:', error);
      return { data: null, success: false, message: 'ERROR AL CALIFICAR ORDEN' };
    }
  }

  // Decide si corresponde ofrecer la encuesta de calificación para esta orden:
  // no si ya fue calificada, no si el cliente ya calificó una orden y todavía
  // no completó 40 compras desde entonces (no guardamos contador propio, se
  // deriva de `ordenes.calificacion`/`fecha_creacion`).
  private readonly RATING_COOLDOWN_ORDERS = 40;

  async shouldPromptRating(
    userId: number | string,
    codigo: string,
  ): Promise<{ data: { shouldPrompt: boolean; codigo: string | null }; success: boolean; message: string }> {
    try {
      const id = String(userId ?? '').trim();
      const order = await this.orderWrite.findOne({ where: { codigo, cliente_documento: id } });
      if (!order || order.calificacion) {
        return { data: { shouldPrompt: false, codigo: null }, success: true, message: 'NO APLICA' };
      }

      const lastRated = await this.orderWrite.findOne({
        where: { cliente_documento: id, calificacion: Not(IsNull()) },
        order: { fecha_creacion: 'DESC' },
      });

      let shouldPrompt = true;
      if (lastRated) {
        const ordersSinceRating = await this.orderWrite.count({
          where: { cliente_documento: id, fecha_creacion: MoreThan(lastRated.fecha_creacion) },
        });
        shouldPrompt = ordersSinceRating >= this.RATING_COOLDOWN_ORDERS;
      }

      return {
        data: { shouldPrompt, codigo: shouldPrompt ? order.codigo : null },
        success: true,
        message: 'OK',
      };
    } catch (error) {
      this.logger.error('Error al evaluar elegibilidad de calificación:', error);
      return { data: { shouldPrompt: false, codigo: null }, success: false, message: 'ERROR' };
    }
  }

  async getOrdersByProduct(
    productoCodigo: string,
  ): Promise<{ data: any; success: boolean; message: string }> {
    try {
      const cod = String(productoCodigo ?? '').trim();
      if (!cod) return { data: { total: 0, unidades: 0, ordenes: [] }, success: true, message: 'SIN CODIGO' };

      const items = await this.orderItemWrite
        .createQueryBuilder('it')
        .innerJoinAndSelect('it.orden', 'o')
        .where('it.producto_codigo = :cod', { cod })
        .orderBy('o.fecha_creacion', 'DESC')
        .take(200)
        .getMany();

      const unidades = items.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
      const ordenes = items.map((it) => ({
        codigo: it.orden?.codigo,
        carritoCodigo: it.orden?.carrito_codigo,
        clienteId: it.orden?.cliente_documento,
        fechaCreacion: it.orden?.fecha_creacion,
        estado: it.orden?.estado,
        cantidad: it.cantidad,
        precioUnitario: Number(it.precio_unitario) || 0,
        nombre: it.producto_nombre,
      }));

      return {
        data: { total: ordenes.length, unidades, ordenes },
        success: true,
        message: 'TRACKING POR PRODUCTO',
      };
    } catch (error) {
      this.logger.error('Error al obtener tracking por producto:', error);
      return { data: { total: 0, unidades: 0, ordenes: [] }, success: false, message: 'ERROR TRACKING PRODUCTO' };
    }
  }

  // "Lo más pedido hoy": agrega unidades vendidas por producto entre el inicio
  // del día actual y ahora, solo de órdenes confirmadas (estado 0). Usado por el
  // filtro de "más pedido hoy" en el storefront.
  async getTopPedidosHoy(
    limit = 50,
  ): Promise<{ data: Array<{ codigo: string; cantidad: number }>; success: boolean; message: string }> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const rows = await this.orderItemWrite
        .createQueryBuilder('it')
        .innerJoin('it.orden', 'o')
        .select('it.producto_codigo', 'codigo')
        .addSelect('SUM(it.cantidad)', 'cantidad')
        .where('o.estado = :estado', { estado: 0 })
        .andWhere('o.fecha_creacion BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
        .groupBy('it.producto_codigo')
        .orderBy('cantidad', 'DESC')
        .limit(limit)
        .getRawMany();

      const data = (rows || []).map((r: any) => ({
        codigo: String(r.codigo),
        cantidad: Number(r.cantidad) || 0,
      }));
      return { data, success: true, message: 'TOP PEDIDOS DE HOY' };
    } catch (error) {
      this.logger.error('Error al obtener top pedidos de hoy:', error);
      return { data: [], success: false, message: 'ERROR AL OBTENER TOP PEDIDOS DE HOY' };
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
    data: { carritos: any[] };
    message: string;
    success: boolean;
    totalCarritos: number;
    totalEnProceso: number;
    totalAbandonados: number;
    totalFinalizados: number;
    totalFiltrado: number;
    promedioFinalizacionMin: number;
  }> {
    const ABANDONO_MIN = 20; 
    const limit = Math.max(1, Number(filters?.limit ?? 10));
    const offset = Math.max(0, Number(filters?.offset ?? filters?.skip ?? 0));
    const search = String(filters?.search ?? '').trim().toLowerCase();
    const situacionFiltro = String(filters?.situacion ?? '').trim();

    const desdeRaw = filters?.desde ?? filters?.fechaDesde;
    const hastaRaw = filters?.hasta ?? filters?.fechaHasta;
    const desde = desdeRaw ? new Date(desdeRaw) : null;
    const hasta = hastaRaw ? new Date(hastaRaw) : null;
    const hasDesde = !!(desde && !Number.isNaN(desde.getTime()));
    const hasHasta = !!(hasta && !Number.isNaN(hasta.getTime()));

    const ageExpr = `TIMESTAMPDIFF(MINUTE, COALESCE(c.updatedAt, c.createdAt), NOW())`;

    const finalizadoExpr = `(c.estado = '0' OR COALESCE(c.finished, '') = '1')`;
    const abandonadoExpr = `(NOT ${finalizadoExpr} AND ${ageExpr} > ${ABANDONO_MIN})`;
    const enProcesoExpr = `(NOT ${finalizadoExpr} AND ${ageExpr} <= ${ABANDONO_MIN})`;
    const situacionExpr = `CASE WHEN ${finalizadoExpr} THEN 'finalizado' WHEN ${abandonadoExpr} THEN 'abandonado' ELSE 'en_proceso' END`;
    const prioridadExpr = `CASE WHEN ${abandonadoExpr} THEN 0 WHEN ${enProcesoExpr} THEN 1 ELSE 2 END`;

    const base = () => {
      const qb = this.carritoRead.createQueryBuilder('c');
      if (hasDesde && hasHasta) qb.andWhere('c.createdAt BETWEEN :desde AND :hasta', { desde, hasta });
      else if (hasDesde) qb.andWhere('c.createdAt >= :desde', { desde });
      else if (hasHasta) qb.andWhere('c.createdAt <= :hasta', { hasta });
      if (search) {
        qb.andWhere(
          `(CAST(c.codigo AS CHAR) LIKE :s OR LOWER(CAST(c.cliente AS CHAR)) LIKE :s)`,
          { s: `%${search}%` },
        );
      }
      return qb;
    };

    const applySituacion = (qb: ReturnType<typeof base>) => {
      if (situacionFiltro === 'finalizado') qb.andWhere(finalizadoExpr);
      else if (situacionFiltro === 'abandonado') qb.andWhere(abandonadoExpr);
      else if (situacionFiltro === 'en_proceso') qb.andWhere(enProcesoExpr);
      return qb;
    };

    const [totalEnProceso, totalAbandonados, totalFinalizados] = await Promise.all([
      base().andWhere(enProcesoExpr).getCount(),
      base().andWhere(abandonadoExpr).getCount(),
      base().andWhere(finalizadoExpr).getCount(),
    ]);

    const avgRow = await base()
      .andWhere(finalizadoExpr)
      .select(`AVG(TIMESTAMPDIFF(MINUTE, c.createdAt, COALESCE(c.updatedAt, c.createdAt)))`, 'avg')
      .getRawOne();
    const promedioFinalizacionMin = Math.round(Number(avgRow?.avg ?? 0));

    const pageQb = applySituacion(base())
      .addSelect(situacionExpr, 'situacion_calc')
      .addSelect(ageExpr, 'age_min')
      .orderBy(prioridadExpr, 'ASC')
      .addOrderBy(ageExpr, 'DESC')
      .addOrderBy('c.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    const { entities, raw } = await pageQb.getRawAndEntities();
    const totalFiltrado = await applySituacion(base()).getCount();

    const carritos = entities.map((c: any, i: number) => {
      const situacion = raw?.[i]?.situacion_calc ?? 'en_proceso';
      const ageMin = Number(raw?.[i]?.age_min ?? 0);
      const finalizado = situacion === 'finalizado';
      const retirar = Number(c?.envio?.retirar ?? 0);
      const creado = c?.createdAt ? new Date(c.createdAt).getTime() : null;
      const actualizado = c?.updatedAt ? new Date(c.updatedAt).getTime() : null;
      return {
        ...c,
        situacion,
        ageMin,
        abandonado: situacion === 'abandonado',
        metodoPago: c?.pago?.tipo ?? null,
        entrega: finalizado ? (retirar === 1 ? 'retiro' : 'delivery') : null,
        tiempoFinalizacionMin:
          finalizado && creado && actualizado
            ? Math.max(0, Math.round((actualizado - creado) / 60000))
            : null,
        total: c?.pago?.monto ?? null,
      };
    });

    return {
      data: { carritos },
      message: 'Carrito obtenido exitosamente',
      success: true,
      totalCarritos: totalEnProceso + totalAbandonados + totalFinalizados,
      totalEnProceso,
      totalAbandonados,
      totalFinalizados,
      totalFiltrado,
      promedioFinalizacionMin,
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

    try {
      const articulosCarrito = [
        ...(carrito.articulos?.contado || []),
        ...(carrito.articulos?.credito || []),
      ];
      const codigosCarrito = [
        ...new Set(articulosCarrito.map((item: any) => String(item.codigo))),
      ];
      if (codigosCarrito.length > 0) {
        const promoInfo: Record<string, any> = await firstValueFrom(
          this.productsService.send(
            { cmd: 'get_promo_info_for_codigos' },
            { codigos: codigosCarrito },
          ),
        );
        const cantidadPorCodigo = new Map<string, number>();
        articulosCarrito.forEach((item: any) => {
          const cod = String(item.codigo);
          cantidadPorCodigo.set(
            cod,
            (cantidadPorCodigo.get(cod) || 0) + (item.cantidad || 1),
          );
        });
        for (const codigo of codigosCarrito) {
          const promo = promoInfo?.[codigo];
          if (
            promo &&
            promo.disponibleEcommerce !== null &&
            promo.disponibleEcommerce !== undefined &&
            (cantidadPorCodigo.get(codigo) || 0) > promo.disponibleEcommerce
          ) {
            return {
              data: [],
              success: false,
              message: `Stock de promoción agotado para el producto ${codigo}. Disponible: ${promo.disponibleEcommerce} unidades.`,
            };
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        'Error al revalidar stock de promoción en finishCart, continuando',
        error,
      );
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
          datosCredito:
            process.cliente?.datosCredito || carrito.cliente?.datosCredito,
          datosLaborales:
            process.cliente?.datosLaborales ||
            carrito.cliente?.datosLaborales,
          referencias:
            process.cliente?.referencias ||
            process.referencias ||
            carrito.cliente?.referencias ||
            [],
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

      setImmediate(async () => {
        try {
          await this.validateDailyPurchaseBenefits(usuario_id);
        } catch (benefitError) {
          console.error('Error al validar beneficios diarios:', benefitError);
        }
      });

      setImmediate(() => {
        const correo = carrito.cliente?.correo;
        if (!correo) return;
        const items = [
          ...(carrito.articulos?.contado || []),
          ...(carrito.articulos?.credito || []),
        ].map((item: any) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
        }));
        this.mailClient
          .send(
            { cmd: 'send_order_confirmation' },
            {
              correo,
              nombre: carrito.cliente?.razonsocial,
              items,
              total: montoTotal,
              trackingUrl: `${STOREFRONT_URL}/tracking/${encodeURIComponent(savedOrder.codigo)}`,
              codigo: savedOrder.codigo,
            },
          )
          .subscribe({
            error: (mailError) =>
              console.error('Error enviando correo de confirmación de pedido:', mailError),
          });
      });

      return {
        data: [{ ...pagoResponse.data, ordenCodigo: savedOrder.codigo }],
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

  @Cron('*/5 * * * *')
  async notifyAbandonedCarts(): Promise<void> {
    const ABANDONO_MIN = 20;
    const ageExpr = `TIMESTAMPDIFF(MINUTE, COALESCE(c.updatedAt, c.createdAt), NOW())`;
    const finalizadoExpr = `(c.estado = '0' OR COALESCE(c.finished, '') = '1')`;
    const abandonadoExpr = `(NOT ${finalizadoExpr} AND ${ageExpr} > ${ABANDONO_MIN})`;

    let carritos: Cart[] = [];
    try {
      carritos = await this.carritoRead
        .createQueryBuilder('c')
        .where(abandonadoExpr)
        .andWhere('c.abandonedEmailSent = false')
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(c.cliente, '$.correo')) IS NOT NULL")
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(c.cliente, '$.correo')) <> ''")
        .getMany();
    } catch (error) {
      this.logger.error('Error consultando carritos abandonados para notificar:', error);
      return;
    }

    for (const carrito of carritos) {
      const correo = carrito.cliente?.correo;
      if (!correo) continue;
      const items = [
        ...(carrito.articulos?.contado || []),
        ...(carrito.articulos?.credito || []),
      ].map((item: any) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio: item.precio,
      }));
      const total = items.reduce(
        (acc: number, item: any) => acc + (item.precio || 0) * (item.cantidad || 0),
        0,
      );

      this.mailClient
        .send(
          { cmd: 'send_abandoned_cart' },
          {
            correo,
            nombre: carrito.cliente?.razonsocial,
            items,
            total,
            recoverUrl: `${STOREFRONT_URL}/cart?c=${encodeURIComponent(carrito.codigo)}`,
            codigo: carrito.codigo,
          },
        )
        .subscribe({
          error: (mailError) =>
            this.logger.error(`Error enviando correo de carrito abandonado ${carrito.codigo}:`, mailError),
        });

      await this.carritoWrite.update({ codigo: carrito.codigo }, { abandonedEmailSent: true });
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

      const mapPromoInfo = (item: any) => {
        if (item.isCombo && !item.isPromo) {
          return { is_combo: 1, is_promo: 0, id_promo: null, nombrePromo: null };
        }
        if (!item.isCombo && item.isPromo) {
          return { is_combo: 0, is_promo: 1, id_promo: item.promoCodigo || null, nombrePromo: item.promoNombre || null };
        }
        if (item.isCombo && item.isPromo) {
          return { is_combo: 1, is_promo: 1, id_promo: item.promoCodigo || null, nombrePromo: item.promoNombre || null };
        }
        return { is_combo: 0, is_promo: 0, id_promo: null, nombrePromo: null };
      };

      const contadoItems = (
        datos.articulos?.contado && Array.isArray(datos.articulos.contado)
          ? datos.articulos.contado
          : []
      ).map((item: any) => ({ ...item, ...mapPromoInfo(item) }));
      const [cuotasCredito, articulosCredito] =
        solicitudesPorCuota.entries().next().value || [0, []];

      const creditoItems = (articulosCredito || []).map((articulo: any) => ({
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        ruta: articulo.ruta,
        imagen: articulo.imagen,
        cantidad: articulo.cantidad,
        precio: articulo.credito?.precio || articulo.precio,
        cuota: cuotasCredito,
        ...mapPromoInfo(articulo),
      }));

      if (contadoItems.length === 0 && creditoItems.length === 0) {
        return {
          data: [],
          success: false,
          message: 'No hay artículos para procesar',
        };
      }

      const buildSolicitud = (
        articulos: { contado: any[]; credito: any[] },
        esCredito: boolean,
      ) => {
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
        nuevaSolicitud.pago = esCredito
          ? datos.pago
          : {
              tipo: datos.pago?.tipo,
              condicion: datos.pago?.condicion,
              periodicidad: datos.pago?.periodicidad,
              moneda: datos.pago?.moneda,
              monto: datos.pago?.monto,
              primerpago: datos.pago?.primerpago,
              entregainicial: datos.pago?.entregainicial,
            };
        nuevaSolicitud.estado = datos.estado;
        nuevaSolicitud.envio =
          solicitud['envio'] || datos.envio || nuevaSolicitud.envio;
        nuevaSolicitud.codigo = Number(codigo);
        nuevaSolicitud.articulos = articulos;
        return nuevaSolicitud;
      };

      const resultados: {
        tipo: 'contado' | 'credito';
        success: boolean;
        count: number;
        secuencia: number | null;
      }[] = [];

      if (contadoItems.length > 0) {
        const solicitudContado = buildSolicitud(
          {
            contado: contadoItems,
            credito: [],
          },
          false,
        );
        const resultado = await this.utilsCart.insertarCarritos(
          solicitudContado,
        );
        resultados.push({
          tipo: 'contado',
          success: resultado.success === 1,
          count: contadoItems.length,
          secuencia: resultado.secuencia,
        });
      }

      if (creditoItems.length > 0) {
        const solicitudCredito = buildSolicitud(
          {
            contado: [],
            credito: creditoItems,
          },
          true,
        );
        const resultado = await this.utilsCart.insertarCarritos(
          solicitudCredito,
        );
        resultados.push({
          tipo: 'credito',
          success: resultado.success === 1,
          count: creditoItems.length,
          secuencia: resultado.secuencia,
        });
      }

      const success = resultados.every((r) => r.success);

      const erpSecuencias = resultados
        .filter((r) => r.secuencia !== null)
        .map((r) => ({ tipo: r.tipo, secuencia: r.secuencia }));
      if (erpSecuencias.length > 0) {
        await this.carritoWrite.update(
          { codigo: Number(codigo) },
          { erpSecuencias },
        );
      }

      return {
        data: resultados,
        success,
        message: success
          ? 'Solicitud(es) insertada(s) en Central App'
          : 'Error al insertar una o más solicitudes en Central App',
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: `ERROR AL INSERTAR EN CENTRAL APP: ${error.message}`,
      };
    }
  }

  async obtenerEstadoPedido(codigo: number): Promise<{
    data: any[];
    success: boolean;
    message: string;
  }> {
    const carrito = await this.carritoRead.findOne({ where: { codigo } });
    if (!carrito) {
      return { data: [], success: false, message: 'Carrito no encontrado' };
    }

    const erpSecuencias: { tipo: string; secuencia: number }[] =
      carrito.erpSecuencias || [];
    if (erpSecuencias.length === 0) {
      return {
        data: [],
        success: false,
        message: 'Este carrito aún no fue enviado al ERP',
      };
    }

    const estados = await Promise.all(
      erpSecuencias.map(async ({ tipo, secuencia }) => ({
        tipo,
        secuencia,
        ...(await this.utilsCart.resolverEstadoPedido(secuencia)),
      })),
    );

    return {
      data: estados,
      success: true,
      message: 'Estado de pedido resuelto',
    };
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

        .andWhere('order.estado = 0')
        .andWhere('order.fecha_creacion BETWEEN :start AND :end', {
          start: todayStart,
          end: todayEnd,
        })
        .getCount();

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
