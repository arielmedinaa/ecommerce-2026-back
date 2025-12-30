import { Controller, Post, Body, UsePipes, ValidationPipe, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('cart')
export class CartController {
  constructor(
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe())
  async addToCart(@Body() data: any) {
    try {
      console.log('Sending addToCart request to cart service:', data);
      const result = await firstValueFrom(
        this.cartClient.send({ cmd: 'add_to_cart' }, data),
      );
      console.log('Received result from cart service:', result);
      return result;
    } catch (error) {
      console.error('Error in addToCart:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Error al agregar al carrito: ' + error.message);
    }
  }
}
