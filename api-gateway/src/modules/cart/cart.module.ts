import { Module } from '@nestjs/common';
import { CartController } from './controllers/cart.controller';
import { MicroserviceModule } from '@config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.forFeature(['CART_SERVICE']),
  ],
  controllers: [CartController],
  exports: [],
})
export class CartModule {}
