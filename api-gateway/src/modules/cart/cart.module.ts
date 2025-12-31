import { Module } from '@nestjs/common';
import { CartController } from './controllers/cart.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.register('CART_SERVICE'),
  ],
  controllers: [CartController],
  exports: [],
})
export class CartModule {}
