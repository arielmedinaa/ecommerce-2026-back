import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeController } from './controller/home.controller';
import { HomeService } from './service/home.service';
import { ImageModule } from '@image/image.module';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { Product, ProductSchema } from '@products/schemas/product.schema';
import { DatabaseModule } from '@shared/config/database/database.module';

@Module({
  imports: [
    MicroserviceModule.register('CONTENT'),
    DatabaseModule.forRoot(),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
    ]),
    ImageModule
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService, MongooseModule], // Exportamos MongooseModule para que otros módulos puedan usarlo
})
export class HomeModule {}