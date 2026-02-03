import { Module } from '@nestjs/common';
import { DatabaseModule } from '@shared/config/database/database.module';
import { Cart, CartSchema } from './schemas/cart.schema'
import { MongooseModule } from "@nestjs/mongoose";
import { Llave, LlaveSchema } from './schemas/llave.schema';
import { Transaccion, TransaccionSchema } from './schemas/transaccion.schema';
import { CartError, CartErrorSchema } from './schemas/errors/cart.error.schema';
import { CartContadoService } from './service/cart.service';
import { CartErrorService } from './service/errors/cart-error.service';
import { CartValidationService } from './service/cart.service.spec';
import { CartController } from "./controller/cart.controller";
import { CommonModule } from '@gateway/common/common.module';
import { JwtModule } from '@nestjs/jwt';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Llave.name, schema: LlaveSchema },
      { name: Transaccion.name, schema: TransaccionSchema },
      { name: CartError.name, schema: CartErrorSchema },
    ]),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
      'PAYMENTS_SERVICE',
    ]),
    DatabaseModule.forRoot(),
    CommonModule,
  ],
  controllers: [CartController],
  providers: [
    CartContadoService,
    CartErrorService,
    CartValidationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
  exports: [CartContadoService, CartErrorService, CartValidationService],
})
export class CartModule {}