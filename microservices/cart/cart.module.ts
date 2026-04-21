import { Module } from '@nestjs/common';
import { CartContadoService } from './service/cart.service';
import { CartErrorService } from './service/errors/cart-error.service';
import { CartValidationService } from './service/cart.service.spec';
import { CartController } from './controller/cart.controller';
import { JwtModule } from '@nestjs/jwt';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { MariaDbModule } from './config/mariadb.module';
import { UtilsCart } from './utils/cart-utils';

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
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
      'PAYMENTS_SERVICE',
      'CONTENT_SERVICE',
      'AUTH_SERVICE',
    ]),
  ],
  controllers: [CartController],
  providers: [
    CartContadoService,
    CartErrorService,
    CartValidationService,
    ResilientService,
    CachePersistenteService,
    UtilsCart,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
  exports: [CartContadoService, CartErrorService, CartValidationService],
})
export class CartModule {}
