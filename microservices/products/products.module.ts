import { Module } from '@nestjs/common';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { PromosService } from './service/promos.service';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { Promo, PromoSchema } from './schemas/promos.schema';
import { DatabaseModule } from '@shared/config/database/database.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Promo.name, schema: PromoSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, PromosService],
  exports: [ProductsService, PromosService],
})
export class ProductsModule {}
