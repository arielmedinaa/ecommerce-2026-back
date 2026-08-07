import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { ProductsImagesService } from './service/products-images.service';
import { PromosService } from './service/promos.service';
import { OfertasService } from './service/ofertas.service';
import { CombosService } from './service/combos.service';
import { ProductsSellersService } from './service/products-sellers.service';
import { NotificationsService } from './service/notifications.service';
import { OfertasValidationService } from './service/errors/ofertas.spec';
import { PromosValidationService } from './service/errors/promos.spec';
import { MariaDbModule } from './config/mariadb.module';
import { ProductsUtils } from './utils/utils-products';
import { ProductsSellersUtils } from './utils/utils-products-sellers';
import { PromoPricingUtil } from './utils/promo-pricing.util';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { RedisModule } from '@shared/common/cache/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RedisModule,
    MicroserviceModule.register('PRODUCTS_SERVICE'),
    MicroserviceModule.forRoot([
      'CART_SERVICE',
    ]),
    MariaDbModule.forWrite(),
    MariaDbModule.forWriteEcommerceProducts(),
    MariaDbModule.forReadEcommerceProducts(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
    MariaDbModule.forEcommerceProductsFeature(),
    MariaDbModule.forEcommerceProductsFeatureRead(),
    MariaDbModule.forOfertasWrite(),
    MariaDbModule.forOfertasRead(),
    MariaDbModule.forOfertasFeature(),
    MariaDbModule.forOfertasFeatureRead(),
    MariaDbModule.forCombosWrite(),
    MariaDbModule.forCombosRead(),
    MariaDbModule.forCombosFeature(),
    MariaDbModule.forCombosFeatureRead(),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsImagesService,
    PromosService,
    OfertasService,
    CombosService,
    ProductsSellersService,
    NotificationsService,
    OfertasValidationService,
    PromosValidationService,
    ProductsUtils,
    ProductsSellersUtils,
    PromoPricingUtil,
    ResilientService,
    ImageStorageService,
  ],
  exports: [ProductsService, ProductsImagesService, PromosService, OfertasService, CombosService, ProductsSellersService, NotificationsService],
})
export class ProductsModule { }
