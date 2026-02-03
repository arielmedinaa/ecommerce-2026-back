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
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'getCart',
        { payload }
      );
      
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
