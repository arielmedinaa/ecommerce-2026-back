import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext } from '@shared/common/logging/request-context';

@Injectable()
export class RpcRequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'rpc') return next.handle();

    const data = context.switchToRpc().getData();
    const requestId =
      data?.headers?.['x-request-id'] ||
      data?.headers?.['x-correlation-id'] ||
      data?.requestId;
    const userId = data?.userId;

    return RequestContext.run(
      {
        requestId: requestId ? String(requestId) : undefined,
        userId: userId ? String(userId) : undefined,
      },
      () => next.handle(),
    );
  }
}

