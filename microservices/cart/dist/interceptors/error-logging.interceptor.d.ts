import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CartErrorService } from '../service/errors/cart-error.service';
export declare class ErrorLoggingInterceptor implements NestInterceptor {
    private readonly cartErrorService;
    private readonly logger;
    constructor(cartErrorService: CartErrorService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
