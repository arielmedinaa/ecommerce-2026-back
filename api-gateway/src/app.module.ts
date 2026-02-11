import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { AppController } from '@gateway/app.controller';
import { ProductsController } from '@gateway/modules/products/controllers/products.controller';
import { CartController } from '@gateway/modules/cart/controllers/cart.controller';
import { PaymentsModule } from '@gateway/modules/payments/payments.module';
import { PaymentsController } from '@gateway/modules/payments/controllers/payments.controller';
import { AuthController } from './modules/auth/controllers/auth.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MicroserviceModule.forRoot([
      'AUTH_SERVICE',
      'CART_SERVICE',
      'CONTENT_SERVICE',
      'ORDERS_SERVICE',
      'PAYMENTS_SERVICE',
      'PRODUCTS_SERVICE'
    ]),
    PaymentsModule,
    AuthModule,
  ],
  controllers: [AppController, ProductsController, CartController, PaymentsController, AuthController],
})
export class AppModule {}
