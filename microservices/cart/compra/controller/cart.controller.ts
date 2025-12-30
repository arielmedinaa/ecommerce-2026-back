import { Body, Controller, Logger, Query, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { CartContadoService } from '../service/cart.service';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartContadoService) {}

  @UseGuards(JwtAuthGuard)
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
}
