import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.register('PRODUCTS_SERVICE'),
  ],
  controllers: [ProductsController],
  exports: [],
})
export class ProductsModule {}
