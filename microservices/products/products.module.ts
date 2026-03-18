import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { PromosService } from './service/promos.service';
import { OfertasService } from './service/ofertas.service';
import { OfertasValidationService } from './service/errors/ofertas.spec';
import { PromosValidationService } from './service/errors/promos.spec';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MariaDbModule.forWrite(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    PromosService,
    OfertasService,
    OfertasValidationService,
    PromosValidationService,
  ],
  exports: [ProductsService, PromosService, OfertasService],
})
export class ProductsModule { }
