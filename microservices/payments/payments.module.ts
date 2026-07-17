import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MariaDbModule } from './config/mariadb.module';
import { PaymentsService } from './service/payments.service';
import { PaymentsController } from './controller/payments.controller';
import { PaymentsValidationService } from './service/payments.spec';
import { PaymentErrorService } from './service/errors/payment-error.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { SqsModule } from '@shared/common/queue/sqs/sqs.module';
import { PaymentsQueueService } from './queue/payments.queue.service';
import { PaymentsSqsWorker } from './worker/payments.sqs.worker';
import { VposService } from './service/vpos.service';

@Module({
  imports: [
    ConfigModule,
    MariaDbModule,
    SqsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsQueueService,
    PaymentsSqsWorker,
    PaymentsValidationService,
    PaymentErrorService,
    VposService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
  exports: [
    PaymentsService,
    PaymentsQueueService,
    PaymentsValidationService,
    PaymentErrorService,
  ],
})
export class PaymentModule {}
