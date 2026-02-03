import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CartErrorService } from '../service/errors/cart-error.service';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  constructor(private readonly cartErrorService: CartErrorService) {}

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
        const cartId = payload?.codigo || payload?.cartId || 'unknown';
        
        const operation = `${className}.${methodName}`;

        await this.cartErrorService.logMicroserviceError(
          error,
          cartId,
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
