import { Controller, Post, Body, UsePipes, ValidationPipe, Inject, Req, Query, Get, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';

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

  // Admin: carritos de un cliente puntual (no depende del token del cliente).
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

  // Quitar un ítem del carrito activo (estado global → DB).
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

  // Setear la cantidad de un ítem del carrito activo.
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

  // Quitar varios ítems del carrito activo en una sola operación (atómica).
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

  // Vaciar el carrito activo.
  @Post('clear')
  @SneakyThrows('CartService', 'clearCart')
  async clear(@Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(this.cartClient.send({ cmd: 'clear_cart' }, { token }));
  }

  // Mergear el carrito del invitado (por email) al usuario logueado.
  @Post('mergeGuest')
  @SneakyThrows('CartService', 'mergeGuestCart')
  async mergeGuest(@Body() body: { guestEmail: string }, @Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1] || '';
    return await firstValueFrom(
      this.cartClient.send({ cmd: 'merge_guest_cart' }, { token, guestEmail: body?.guestEmail }),
    );
  }

  // Resumen de compras por usuario (para clasificar tipo de cliente).
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
    limit: number;
    skip: number;
    sort: string;
    order: string;
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
