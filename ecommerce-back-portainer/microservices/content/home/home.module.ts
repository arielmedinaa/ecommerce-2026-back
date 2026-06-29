import { Module } from '@nestjs/common';
import { HomeController } from './controller/home.controller';
import { HomeSectionsController } from './controller/home-sections.controller';
import { HomeService } from './service/home.service';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';
import { VerticalesModule } from '../verticales/verticales.module';
import { HomeSectionsService } from './service/home-sections.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeSection } from './schemas/home-section.schema';

@Module({
  imports: [
    MicroserviceModule.register('CONTENT'),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
      'IMAGE_SERVICE',
    ]),
    VerticalesModule,
    TypeOrmModule.forFeature([HomeSection], 'WRITE_CONNECTION'),
    TypeOrmModule.forFeature([HomeSection], 'READ_CONNECTION'),
  ],
  controllers: [HomeController, HomeSectionsController],
  providers: [
    HomeService,
    HomeSectionsService,
    ResilientService,
    FallbackDataService,
  ],
  exports: [HomeService],
})
export class HomeModule {}
