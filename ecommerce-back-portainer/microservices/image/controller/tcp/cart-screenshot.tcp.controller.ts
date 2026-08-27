import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CartScreenshotService } from '../../service/cart-screenshot.service';

@Controller()
export class CartScreenshotController {
  constructor(private readonly cartScreenshotService: CartScreenshotService) {}

  @MessagePattern({ cmd: 'upload_cart_screenshot' })
  async upload(@Payload() data: { key: string; cartCodigo: string }) {
    return await this.cartScreenshotService.saveFromS3(data.key, data.cartCodigo);
  }

  @MessagePattern({ cmd: 'get_cart_screenshot' })
  async get(@Payload() data: { cartCodigo: string }) {
    return await this.cartScreenshotService.getByCartCodigo(data.cartCodigo);
  }
}
