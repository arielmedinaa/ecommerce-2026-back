import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Inject,
  UseGuards,
  Request,
  Query,
  Get,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  async addToCart(
    @Request() req,
    @Body() body: any,
    @Query('email') email?: string,
    @Query('codigo') codigo?: string,
  ) {
    if (!req.user) {
      throw new Error('Usuario no autenticado');
    }

    const token = req.headers.authorization?.replace('Bearer ', '');

    const payload = {
      token,
      email: email || req.user.email,
      codigo,
      body,
    };

    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'add_to_cart' }, payload),
      );
    } catch (error) {
      console.error('Error al agregar al carrito:', {
        message: error.message,
        stack: error.stack,
        payload,
      });
      throw new Error('Error al agregar al carrito: ' + error.message);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  async getCart(
    @Request() req,
    @Query('email') email?: string,
    @Query('codigo') codigo?: string,
  ) {
    if (!req.user) {
      throw new Error('Usuario no autenticado');
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = { token, email: email || req.user.email, codigo };

    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'get_cart' }, payload),
      );
    } catch (error) {
      console.error('Error al obtener el carrito:', {
        message: error.message,
        stack: error.stack,
        payload,
      });
      throw new Error('Error al obtener el carrito: ' + error.message);
    }
  }
}
