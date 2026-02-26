import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PaymentErrorService } from '../service/errors/payment-error.service';
export declare class ErrorLoggingInterceptor implements NestInterceptor {
    private readonly paymentErrorService;
    private readonly logger;
    constructor(paymentErrorService: PaymentErrorService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
