import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentErrorService } from '../service/errors/payment-error.service';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  constructor(private readonly paymentErrorService: PaymentErrorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    
    const args = context.getArgs();
    const payload = args[0];
    
    let pattern = 'unknown';
    try {
      const reflectMetadata = Reflect.getMetadata('__pattern__', handler);
      if (reflectMetadata) {
        pattern = reflectMetadata.cmd || JSON.stringify(reflectMetadata);
      }
    } catch {
      pattern = methodName;
    }

    return next.handle().pipe(
      catchError(async (error) => {
        const paymentId = payload?.codigoCarrito || payload?.paymentId || payload?.idTransaccion || 'unknown';
        
        const operation = `${className}.${methodName}`;

        await this.paymentErrorService.logMicroserviceError(
          error,
          paymentId,
          operation,
          {
            payload: payload,
            pattern: pattern,
            className: className,
            methodName: methodName,
          }
        );

        this.logger.error(
          `Error in ${operation}: ${error.message}`,
          error.stack,
        );

        return throwError(() => error);
      }),
    );
  }
}
