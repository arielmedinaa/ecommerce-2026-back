import { Module } from '@nestjs/common';
import { MariaDbModule } from './config/mariadb.module';
import { PaymentsService } from './service/payments.service';
import { PaymentsController } from './controller/payments.controller';
import { PaymentsValidationService } from './service/payments.spec';
import { PaymentErrorService } from './service/errors/payment-error.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

@Module({
  imports: [
    MariaDbModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsValidationService,
    PaymentErrorService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
  exports: [PaymentsService, PaymentsValidationService, PaymentErrorService],
})
export class PaymentModule {}