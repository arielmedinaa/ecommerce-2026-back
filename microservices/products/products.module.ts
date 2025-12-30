import { Module } from '@nestjs/common';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products.service';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { DatabaseModule } from '@shared/config/database/database.module';

@Module({
  imports: [
    MicroserviceModule.register('PRODUCTS'),
    DatabaseModule.forRoot(),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
