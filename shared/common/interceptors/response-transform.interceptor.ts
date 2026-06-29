import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseData } from '../response/response.data';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        if (value instanceof ResponseData) return value;
        if (Buffer.isBuffer(value)) return value;
        if (value === null || value === undefined) {
          return { success: true, message: '', data: null };
        }
        if (Array.isArray(value) || typeof value !== 'object') {
          return { success: true, message: '', data: value };
        }
        return { success: true, message: '', ...value };
      }),
    );
  }
}
