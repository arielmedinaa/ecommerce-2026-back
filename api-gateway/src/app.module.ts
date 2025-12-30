import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { AppController } from '@gateway/app.controller';
import { ProductsController } from '@gateway/modules/products/controllers/products.controller';
import { CartController } from '@gateway/modules/cart/controllers/cart.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '60s' },
    }),
    MicroserviceModule.forRoot([
      'AUTH_SERVICE',
      'CART_SERVICE',
      'CONTENT_SERVICE',
      'ORDERS_SERVICE',
      'PAYMENTS_SERVICE',
      'PRODUCTS_SERVICE'
    ]),
  ],
  controllers: [AppController, ProductsController, CartController],
})
export class AppModule {}
