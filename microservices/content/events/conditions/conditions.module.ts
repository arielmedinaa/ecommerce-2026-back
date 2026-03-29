import { Module } from '@nestjs/common';
import { ConditionsController } from './controller/conditions.controller';
import { ConditionsService } from './service/conditions.service';
import { MariaDbModule } from '@content/config/mariadb.module';

@Module({
  imports: [MariaDbModule.forFeature(), MariaDbModule.forFeatureRead()],
  controllers: [ConditionsController],
  providers: [ConditionsService],
  exports: [ConditionsService],
})
export class ConditionsModule {}
