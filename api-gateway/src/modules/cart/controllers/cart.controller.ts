import { Controller, Post, Body, UsePipes, ValidationPipe, Inject, Req, Query, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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
    
    console.log('📤 getCart - Sending payload to microservice:', payload);
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'get_cart' }, payload),
    );
    
    console.log('📥 getCart - Microservice response:', result);
    
    return result;
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
    
    console.log('📤 finishCart - Sending payload to microservice:', payload);
    
    const result = await firstValueFrom(
      this.cartClient.send({ cmd: 'finish_cart' }, payload),
    );
    
    console.log('📥 finishCart - Microservice response:', result);
    
    return result;
  }
}
