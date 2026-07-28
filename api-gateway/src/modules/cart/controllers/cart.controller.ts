import { Controller, Post, Patch, Body, UsePipes, ValidationPipe, Inject, Req, Query, Get, Param, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'addToCart')
  async addToCart(@Body() body: any, @Req() request: Request, @Query() query: any) {
    const authorization = request.headers.authorization;
    const token = authorization?.split(' ')[1] || '';
    
    const cartCodigo = query.codigo;
    const cartCodigoNum = Number(cartCodigo);
    const payload = {
      token: token,
      email: query.cuenta || '',
      codigo: cartCodigoNum,
      body: body
    };
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'add_to_cart' }, payload),
    );
    
    return result;
  }

  @Get('byUser/:userId')
  @SneakyThrows('CartService', 'getCartsByUser')
  async getCartsByUser(@Param('userId') userId: string, @Query() query: any) {
    return await firstValueFrom(
      this.cartClient.send(
        { cmd: 'get_carts_by_user' },
        { userId, estado: query?.estado },
      ),
    );
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('CartService', 'getUserOrders')
  async getUserOrders(@Req() request: any) {
    const userId = request.user?.sub;
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'get_user_orders' }, { userId }),
    );
  }

  @Patch('orders/:codigo')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('CartService', 'updateOrder')
  async updateOrder(
    @Param('codigo') codigo: string,
    @Body() body: any,
    @Req() request: any,
  ) {
    const userId = request.user?.sub;
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'update_order' }, { userId, codigo, patch: body }),
    );
  }

  @Post('orders/:codigo/rating')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('CartService', 'rateOrder')
  async rateOrder(
    @Param('codigo') codigo: string,
    @Body() body: any,
    @Req() request: any,
  ) {
    const userId = request.user?.sub;
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'rate_order' }, { userId, codigo, body }),
    );
  }

  @Get('orders/:codigo/rating-eligibility')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('CartService', 'shouldPromptRating')
  async shouldPromptRating(
    @Param('codigo') codigo: string,
    @Req() request: any,
  ) {
    const userId = request.user?.sub;
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'should_prompt_rating' }, { userId, codigo }),
    );
  }

  @Get('orders/byUser/:userId')
  @SneakyThrows('CartService', 'getOrdersByUserAdmin')
  async getOrdersByUserAdmin(@Param('userId') userId: string) {
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'get_user_orders' }, { userId }),
    );
  }

  @Get('orders/byProduct/:codigo')
  @SneakyThrows('CartService', 'getOrdersByProduct')
  async getOrdersByProduct(@Param('codigo') codigo: string) {
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'get_orders_by_product' }, { codigo }),
    );
  }

  @Get('top-pedidos-hoy')
  @SneakyThrows('CartService', 'getTopPedidosHoy')
  async getTopPedidosHoy(@Query('limit') limit?: string) {
    return await firstValueFrom(
      this.cartClient.send(
        { cmd: 'get_top_pedidos_hoy' },
        { limit: limit ? Number(limit) : undefined },
      ),
    );
  }

  @Get(':codigo/estado-pedido')
  @SneakyThrows('CartService', 'getEstadoPedido')
  async getEstadoPedido(@Param('codigo') codigo: string) {
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'get_estado_pedido' }, { codigo }),
    );
  }

  @Post('removeItem')
  @SneakyThrows('CartService', 'removeCartItem')
  async removeItem(@Body() body: any, @Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(
      this.cartClient.send(
        { cmd: 'remove_cart_item' },
        { token, productoCodigo: body?.productoCodigo, tipo: body?.tipo },
      ),
    );
  }

  @Post('itemQty')
  @SneakyThrows('CartService', 'setCartItemQty')
  async setItemQty(@Body() body: any, @Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(
      this.cartClient.send(
        { cmd: 'set_cart_item_qty' },
        { token, productoCodigo: body?.productoCodigo, cantidad: body?.cantidad, tipo: body?.tipo },
      ),
    );
  }

  @Post('removeItems')
  @SneakyThrows('CartService', 'removeCartItems')
  async removeItems(@Body() body: any, @Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(
      this.cartClient.send(
        { cmd: 'remove_cart_items' },
        { token, items: Array.isArray(body?.items) ? body.items : [] },
      ),
    );
  }

  @Post('clear')
  @SneakyThrows('CartService', 'clearCart')
  async clear(@Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(this.cartClient.send({ cmd: 'clear_cart' }, { token }));
  }

  @Post('mergeGuest')
  @SneakyThrows('CartService', 'mergeGuestCart')
  async mergeGuest(@Body() body: { guestEmail: string }, @Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'merge_guest_cart' }, { token, guestEmail: body?.guestEmail }),
    );
  }

  @Post('comprasResumen')
  @SneakyThrows('CartService', 'getComprasResumen')
  async getComprasResumen(@Body() body: { userIds: (number | string)[] }) {
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'get_compras_resumen' }, { userIds: body?.userIds || [] }),
    );
  }

  @Get('getCart')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'getCart')
  async getCart(@Req() request: Request, @Query() query: any) {
    const authorization = request.headers.authorization;
    const token = authorization?.split(' ')[1] || '';
    
    const cartCodigo = query.codigo;
    const cartCodigoNum = Number(cartCodigo);
    const payload = {
      token: token,
      cuenta: query.cuenta || '',
      codigo: cartCodigoNum,
    };
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'get_cart' }, payload),
    );
    return result;
  }

  @Post('getAllCart')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'getAllCart')
  async getAllCart(@Body() body: {
    limit: number;
    skip: number;
    sort: string;
    order: string;
    estado: number;
  }, @Req() request: Request){
    const authorization = request.headers.authorization;
    const token = authorization?.split(' ')[1] || '';
    
    return await firstValueFrom(
      this.cartClient.send({
        cmd: 'get_all_cart'
      }, {
        token: token, 
        limit: body.limit, 
        skip: body.skip, 
        sort: body.sort, 
        order: body.order,
        estado: body.estado
      })
    )
  }

  @Post('getCartWithoutToken')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'getCartWithoutToken')
  async getCartWithoutToken(@Body() body: {
    limit?: number;
    offset?: number;
    skip?: number;
    search?: string;
    situacion?: 'en_proceso' | 'abandonado' | 'finalizado';
    desde?: string;
    hasta?: string;
  }){
    return await firstValueFrom(
      this.cartClient.send({
        cmd: 'getAllCartWhithoutToken'
      }, body)
    )
  }

  @Post('getMissingCart')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'getMissingCart')
  async getMissingCart(@Body() body: {
    limit: number;
    skip: number;
    sort: string;
    order: string;
  }){
    return await firstValueFrom(
      this.cartClient.send({
        cmd: 'get_missing_cart'
      }, { 
        limit: body.limit, 
        skip: body.skip, 
        sort: body.sort, 
        order: body.order
      })
    )
  }

  @Post('getMissingCartByProduct')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'getMissingCartByProduct')
  async getMissingCartByProduct(@Body() body: {
    limit: number;
    skip: number;
    sort: string;
    order: string;
    codigo: number;
  }){
    return await firstValueFrom(
      this.cartClient.send({
        cmd: 'get_missing_cart_by_product'
      }, { 
        limit: body.limit, 
        skip: body.skip, 
        sort: body.sort, 
        order: body.order,
        codigo: body.codigo
      })
    )
  }
  
  @Post('finishCart')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'finishCart')
  async finishCart(@Body() body: any, @Req() request: Request, @Query() query: any) {
    const authorization = request.headers.authorization;
    const token = authorization?.split(' ')[1] || '';
    
    const cartCodigo = query.codigo;
    const cartCodigoNum = Number(cartCodigo);
    const payload = {
      token: token,
      cuenta: query.cuenta || '',
      codigo: cartCodigoNum,
      process: body
    };
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'finish_cart' }, payload),
    );
    return result;
  }
}
