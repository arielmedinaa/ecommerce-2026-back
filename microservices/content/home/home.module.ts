import { Module } from '@nestjs/common';
import { HomeController } from './controller/home.controller';
import { HomeService } from './service/home.service';
import { ImageModule } from '@image/image.module';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';

@Module({
  imports: [
    MicroserviceModule.register('CONTENT'),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
    ]),
    ImageModule,
  ],
  controllers: [HomeController],
  providers: [
    HomeService,
    ResilientService,
    FallbackDataService,
  ],
  exports: [HomeService],
})
export class HomeModule {}