import { Module } from '@nestjs/common';
import { DatabaseModule } from '@shared/config/database/database.module';
import { Payments, PaymentsSchema } from './schemas/payments.schema';
import { PaymentError, PaymentErrorSchema } from './schemas/errors/payment.error.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './service/payments.service';
import { PaymentsController } from './controller/payments.controller';
import { PaymentsValidationService } from './service/payments.spec';
import { PaymentErrorService } from './service/errors/payment-error.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payments.name, schema: PaymentsSchema },
      { name: PaymentError.name, schema: PaymentErrorSchema },
    ]),
    DatabaseModule.forRoot(),
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