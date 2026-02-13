import { Controller, Post, Body, UsePipes, ValidationPipe, Inject, Req, Query, Get } from '@nestjs/common';
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
        order: body.order
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
