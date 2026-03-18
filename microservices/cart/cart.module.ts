import { Module } from '@nestjs/common';
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseModule } from '@shared/config/database/database.module';
import { CartError, CartErrorSchema } from './schemas/errors/cart.error.schema';
import { CartContadoService } from './service/cart.service';
import { CartErrorService } from './service/errors/cart-error.service';
import { CartValidationService } from './service/cart.service.spec';
import { CartController } from "./controller/cart.controller";
import { JwtModule } from '@nestjs/jwt';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MariaDbModule.forWrite(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
    MongooseModule.forFeature([
      { name: CartError.name, schema: CartErrorSchema },
    ]),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
      'PAYMENTS_SERVICE',
    ]),
    DatabaseModule.forRoot(), // Necesario para CartErrorService
  ],
  controllers: [CartController],
  providers: [
    CartContadoService,
    CartErrorService,
    CartValidationService,
    ResilientService,
    CachePersistenteService,
    //ObtenerClaveService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
  exports: [CartContadoService, CartErrorService, CartValidationService],
})
export class CartModule {}