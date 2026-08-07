import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CartContadoService } from '@cart/service/cart.service';
import { CartErrorService } from '@cart/service/errors/cart-error.service';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(
    private readonly cartService: CartContadoService,
    private readonly cartErrorService: CartErrorService,
  ) {}

  @MessagePattern({ cmd: 'add_to_cart' })
  async addToCart(@Payload() payload: any) {
    const { token, email, codigo, body, usuario_id } = payload;
    try {
      const result = await this.cartService.addCart(
        token,
        email,
        codigo ? Number(codigo) : 0,
        body,
        usuario_id,
      );
      return result;
    } catch (error) {
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'addToCart',
        { payload }
      );
      
      this.logger.error('Error adding to cart:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_ventas_por_codigos' })
  async getVentasPorCodigos(@Payload() payload: { codigos: string[] }) {
    return this.cartService.getVentasPorCodigos(payload?.codigos || []);
  }

  @MessagePattern({ cmd: 'get_cart' })
  async getCart(@Payload() payload: any) {
    const { token, cuenta, codigo } = payload;
    try {
      const result = await this.cartService.getCart(
        token,
        cuenta,
        codigo ? codigo : 0,
      );
      
      return result;
    } catch (error) {
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'getCart',
        { payload }
      );
      
      this.logger.error('Error al obtener los carritos', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_all_cart' })
  async getAllCartByClient(@Payload() payload: any) {
    const { token, limit, skip, sort, order, estado } = payload;
    return this.cartService.getAllCart(token, limit, skip, sort, order, estado);
  }

  @MessagePattern({ cmd: 'get_missing_cart' })
  async getMissingCart(@Payload() payload: any) {
    const {limit, skip, sort, order } = payload;
    return this.cartService.getMissingCart(limit, skip, sort, order);
  }

  @MessagePattern({ cmd: 'get_missing_cart_by_product' })
  async getMissingCartByProduct(@Payload() payload: any) {
    const {limit, skip, sort, order, codigo, estado } = payload;
    return this.cartService.getCartByProduct({limit, skip, sort, order, codigo, estado });
  }

  @MessagePattern({ cmd: 'getAllCartWhithoutToken' })
  async getAllCartWhithoutToken(@Payload() payload: any) {
    return this.cartService.getCartWithoutToken(payload);
  }

  @MessagePattern({ cmd: 'get_carts_by_user' })
  async getCartsByUser(@Payload() payload: { userId: number | string; estado?: string }) {
    return this.cartService.getCartsByUserId(payload?.userId, payload?.estado);
  }

  @MessagePattern({ cmd: 'get_compras_resumen' })
  async getComprasResumen(@Payload() payload: { userIds: (number | string)[] }) {
    return this.cartService.getComprasResumenByUsers(payload?.userIds || []);
  }

  @MessagePattern({ cmd: 'get_user_top_categorias' })
  async getUserTopCategorias(
    @Payload() payload: { userId: number | string; limit?: number },
  ) {
    return this.cartService.getUserTopCategorias(payload?.userId, payload?.limit ?? 5);
  }

  @MessagePattern({ cmd: 'get_user_orders' })
  async getUserOrders(@Payload() payload: { userId: number | string }) {
    return this.cartService.getUserOrders(payload?.userId);
  }

  @MessagePattern({ cmd: 'get_estado_pedido' })
  async getEstadoPedido(@Payload() payload: { codigo: number }) {
    return this.cartService.obtenerEstadoPedido(Number(payload?.codigo));
  }

  @MessagePattern({ cmd: 'update_order' })
  async updateOrder(
    @Payload() payload: { userId: number | string; codigo: string; patch: any },
  ) {
    return this.cartService.updateOrder(payload?.userId, payload?.codigo, payload?.patch || {});
  }

  @MessagePattern({ cmd: 'rate_order' })
  async rateOrder(
    @Payload() payload: { userId: number | string; codigo: string; body: any },
  ) {
    return this.cartService.rateOrder(payload?.userId, payload?.codigo, payload?.body || {});
  }

  @MessagePattern({ cmd: 'should_prompt_rating' })
  async shouldPromptRating(
    @Payload() payload: { userId: number | string; codigo: string },
  ) {
    return this.cartService.shouldPromptRating(payload?.userId, payload?.codigo);
  }

  @MessagePattern({ cmd: 'get_orders_by_product' })
  async getOrdersByProduct(@Payload() payload: { codigo: string }) {
    return this.cartService.getOrdersByProduct(payload?.codigo);
  }

  @MessagePattern({ cmd: 'get_top_pedidos_hoy' })
  async getTopPedidosHoy(@Payload() payload: { limit?: number }) {
    return this.cartService.getTopPedidosHoy(payload?.limit);
  }

  @MessagePattern({ cmd: 'sync_cart_cliente' })
  async syncCartCliente(
    @Payload() payload: { userId: number | string; cliente: { razonsocial?: string; correo?: string; telefono?: string; documento?: string } },
  ) {
    return this.cartService.syncClienteByUser(payload?.userId, payload?.cliente || {});
  }

  @MessagePattern({ cmd: 'remove_cart_item' })
  async removeCartItem(@Payload() payload: { token: string; productoCodigo: string | number; tipo?: 'contado' | 'credito' }) {
    return this.cartService.removeCartItem(payload?.token, payload?.productoCodigo, payload?.tipo);
  }

  @MessagePattern({ cmd: 'remove_cart_items' })
  async removeCartItems(@Payload() payload: { token: string; items: Array<{ codigo: string | number; tipo?: 'contado' | 'credito' }> }) {
    return this.cartService.removeCartItems(payload?.token, payload?.items);
  }

  @MessagePattern({ cmd: 'change_cart_item_condition' })
  async changeCartItemCondition(
    @Payload()
    payload: {
      token: string;
      productoCodigo: string | number;
      fromTipo: 'contado' | 'credito';
      toTipo: 'contado' | 'credito';
      precio: number;
      cuota?: number;
    },
  ) {
    return this.cartService.changeCartItemCondition(
      payload?.token,
      payload?.productoCodigo,
      payload?.fromTipo,
      payload?.toTipo,
      payload?.precio,
      payload?.cuota,
    );
  }

  @MessagePattern({ cmd: 'clear_cart' })
  async clearCart(@Payload() payload: { token: string }) {
    return this.cartService.clearCart(payload?.token);
  }

  @MessagePattern({ cmd: 'set_cart_item_qty' })
  async setCartItemQty(@Payload() payload: { token: string; productoCodigo: string | number; cantidad: number; tipo?: 'contado' | 'credito' }) {
    return this.cartService.setCartItemQty(payload?.token, payload?.productoCodigo, payload?.cantidad, payload?.tipo);
  }

  @MessagePattern({ cmd: 'merge_guest_cart' })
  async mergeGuestCart(@Payload() payload: { token: string; guestEmail: string }) {
    return this.cartService.mergeGuestCart(payload?.token, payload?.guestEmail);
  }

  @MessagePattern({ cmd: 'user_has_movements' })
  async userHasMovements(@Payload() payload: { userId: number | string }) {
    return this.cartService.userHasMovements(payload?.userId);
  }

  @MessagePattern({ cmd: 'count_user_orders' })
  async countUserOrders(
    @Payload() payload: { clienteDocumento: string; estado?: number },
  ) {
    return this.cartService.countUserOrders(
      payload?.clienteDocumento,
      payload?.estado ?? 1,
    );
  }

  @MessagePattern({ cmd: 'finish_cart' })
  async finishCart(@Payload() payload: any) {
    const { token, cuenta, codigo, process } = payload;
    try {
      const result = await this.cartService.finishCart(
        token,
        cuenta,
        codigo,
        process,
      );
      return result;
    } catch (error) {
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'finishCart',
        { payload }
      );
      
      this.logger.error('Error finalizando el carrito', error);
      throw error;
    }
  }
}
