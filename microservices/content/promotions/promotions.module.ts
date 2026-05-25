import { Module } from '@nestjs/common';
import { MariaDbModule } from '@content/config/mariadb.module';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { PromotionsController } from './controller/promotions.controller';
import { PromotionsService } from './service/promotions.service';

@Module({
  imports: [
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
    MicroserviceModule.register('CONTENT'),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}

