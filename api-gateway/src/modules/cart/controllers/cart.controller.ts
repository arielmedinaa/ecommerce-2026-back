import { Controller, Post, Body, UsePipes, ValidationPipe, Inject, Req, Query } from '@nestjs/common';
import { ClientProxy, Payload } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { SneakyThrows } from '../../../common/decorators';

@Controller('cart')
export class CartController {
  constructor(
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe())
  @SneakyThrows('CartService', 'addToCart')
  async addToCart(@Payload() data: any, @Body() body: any, @Req() request: Request, @Query() query: any) {
    const authorization = request.headers.authorization;
    const token = authorization?.split(' ')[1] || '';
    
    const cartCodigo = query.codigo;
    const cartCodigoNum = Number(cartCodigo);
    const payload = {
      token: token,
      email: data.cuenta || '',
      codigo: cartCodigoNum,
      body: body
    };
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'add_to_cart' }, payload),
    );
    
    console.log('Cart service response:', result);
    return result;
  }
}
