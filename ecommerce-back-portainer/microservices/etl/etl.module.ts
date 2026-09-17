import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EtlController } from './controller/etl.controller';
import { EtlAgentService } from './service/etl-agent.service';
import { ClaudeClientService } from '@shared/common/services/claude-client.service';
import { EtlConfigStoreService } from './service/etl-config-store.service';
import { ProviderRunnerService } from './service/provider-runner.service';
import { SchedulerService } from './service/scheduler.service';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { SellerImageValidatorUtil } from '@products/utils/products-seller/seller-image-validator.util';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MicroserviceModule.register('PRODUCTS_SERVICE'),
  ],
  controllers: [EtlController],
  providers: [
    EtlAgentService,
    ClaudeClientService,
    EtlConfigStoreService,
    ProviderRunnerService,
    SchedulerService,
    ImageStorageService,
    SellerImageValidatorUtil,
  ],
})
export class EtlModule {}
