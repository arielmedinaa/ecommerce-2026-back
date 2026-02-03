import { Module } from '@nestjs/common';
import { PaymentsController } from './controllers/payments.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.register('PAYMENTS_SERVICE'),
  ],
  controllers: [PaymentsController],
  exports: [],
})
export class PaymentsModule {}
