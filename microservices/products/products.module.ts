import { Module } from '@nestjs/common';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { PromosService } from './service/promos.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { Promo, PromoSchema } from './schemas/promos.schema';
import { Combos, CombosSchema } from './schemas/combos.schema';
import { DatabaseModule } from '@shared/config/database/database.module';
import { OfertasService } from './service/ofertas.service';
import { Ofertas, OfertasSchema } from './schemas/ofertas.schema';
import { OfertasValidationService } from './service/errors/ofertas.spec';
import { PromosValidationService } from './service/errors/promos.spec';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    MariaDbModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Promo.name, schema: PromoSchema },
      { name: Combos.name, schema: CombosSchema },
      { name: Ofertas.name, schema: OfertasSchema },
      { name: Promo.name, schema: PromoSchema },
    ]),
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
export class ProductsModule {}
