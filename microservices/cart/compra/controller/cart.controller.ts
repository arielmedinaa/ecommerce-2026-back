import { Body, Controller, Logger, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { CartContadoService } from '../service/cart.service';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartContadoService) {}

  @UseGuards(JwtAuthGuard)
  @MessagePattern({ cmd: 'add_to_cart' })
  async addToCart(@Payload() data: any, @Ctx() context: any, @Body() body: any) {
    try {
      const token = context.args[0].headers?.authorization?.split(' ')[1];
      const result = await this.cartService.addCart(
        token,
        data.cuenta,
        data.codigo,
        body,
      );
      return result;
    } catch (error) {
      this.logger.error('Error adding to cart:', error);
      throw error;
    }
  }
}
