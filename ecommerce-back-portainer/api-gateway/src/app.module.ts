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
import { ContentModule } from './modules/content/content.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';
import { ProviderAuthGuard } from '@gateway/common/guards/provider-auth.guard';
import { RolesGuard } from '@gateway/common/guards/roles.guard';
import { ImageController } from './modules/image/controller/image.controller';
import { ImageModule } from './modules/image/image.module';
import { MailController } from './modules/mail/controller/mail.controller';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
    MicroserviceModule.forRoot([
      'AUTH_SERVICE',
      'CART_SERVICE',
      'CONTENT_SERVICE',
      'ORDERS_SERVICE',
      'PAYMENTS_SERVICE',
      'PRODUCTS_SERVICE',
      'IMAGE_SERVICE',
      'MAIL_SERVICE',
      'ETL_SERVICE',
    ]),
    PaymentsModule,
    AuthModule,
    ContentModule,
    ImageModule,
    MailModule,
  ],
  controllers: [
    AppController,
    ProductsController,
    CartController,
    PaymentsController,
    AuthController,
    ImageController,
    MailController,
  ],
  providers: [JwtAuthGuard, ProviderAuthGuard, RolesGuard],
})
export class AppModule {}
