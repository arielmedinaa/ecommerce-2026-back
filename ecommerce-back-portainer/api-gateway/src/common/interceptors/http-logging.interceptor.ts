import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method = req?.method;
    const url = req?.originalUrl || req?.url;
    const start = Date.now();

    return next.handle().pipe(
      catchError((err) => {
        // Keep error logging light; BaseHttpException/SneakyThrows will format the response.
        this.logger.error(
          { method, url, statusCode: err?.status || err?.statusCode || 500 },
          err?.stack,
        );
        return throwError(() => err);
      }),
      finalize(() => {
        const durationMs = Date.now() - start;
        const statusCode = res?.statusCode;
        this.logger.log({ method, url, statusCode, durationMs });
      }),
    );
  }
}

