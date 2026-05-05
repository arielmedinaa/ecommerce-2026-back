import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { ProductsImagesService } from './service/products-images.service';
import { PromosService } from './service/promos.service';
import { OfertasService } from './service/ofertas.service';
import { OfertasValidationService } from './service/errors/ofertas.spec';
import { PromosValidationService } from './service/errors/promos.spec';
import { MariaDbModule } from './config/mariadb.module';
import { ProductsUtils } from './utils/utils-products';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsImagesService,
    PromosService,
    OfertasService,
    OfertasValidationService,
    PromosValidationService,
    ProductsUtils,
    ResilientService,
  ],
  exports: [ProductsService, ProductsImagesService, PromosService, OfertasService],
})
export class ProductsModule { }
