import { Body, Controller, Logger, Query, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { CartContadoService } from '@cart/service/cart.service';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartContadoService) {}

  // Log para saber si el microservicio está recibiendo peticiones
  @MessagePattern({ cmd: 'ping' })
  async ping() {
    console.log('🏓 Microservice ping received');
    return { status: 'ok', message: 'Cart microservice is alive' };
  }

  // @UseGuards(JwtAuthGuard)
  @MessagePattern({ cmd: 'add_to_cart' })
  async addToCart(@Payload() payload: any) {
    const { token, email, codigo, body } = payload;
    try {
      const result = await this.cartService.addCart(
        token,
        email,
        codigo ? Number(codigo) : 0,
        body,
      );
      return result;
    } catch (error) {
      this.logger.error('Error adding to cart:', error);
      throw error;
    }
  }

  // @UseGuards(JwtAuthGuard)
  @MessagePattern({ cmd: 'get_cart' })
  async getCart(@Payload() payload: any) {
    const { token, cuenta, codigo } = payload;
    try {
      const result = await this.cartService.getCart(
        token,
        cuenta,
        codigo ? codigo : 0,
      );
      
      console.log('📥 Microservice getCart - Service result:', result);
      return result;
    } catch (error) {
      console.error('🚨 Microservice getCart - Error in service:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        fullError: error
      });
      this.logger.error('Error al obtener los carritos', error);
      throw error;
    }
  }
}
