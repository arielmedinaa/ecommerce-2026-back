import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
} from '@nestjs/microservices';
import { Observable, throwError, timer } from 'rxjs';
import { retry, timeout as rxTimeout } from 'rxjs/operators';
import { RequestContext } from '@shared/common/logging/request-context';

const CONNECTION_ERROR_RETRY_ATTEMPTS = 2;
const CONNECTION_ERROR_RETRY_BASE_DELAY_MS = 250;

const SERVICE_TIMEOUT_MS: Record<string, number> = {
  PRODUCTS: 90000,
  ETL: 90000,
  CART: 45000,
  CONTENT: 30000,
  IMAGE: 30000,
  MAIL: 20000,
  PAYMENTS: 20000,
  ORDERS: 20000,
  AUTH: 15000,
};
const FALLBACK_TIMEOUT_MS = 30000;

function normalizeServiceKey(serviceName: string): string {
  return serviceName.toUpperCase().replace(/_SERVICE$/, '');
}

function resolveTimeoutMs(serviceName: string): number {
  return (
    SERVICE_TIMEOUT_MS[normalizeServiceKey(serviceName)] ?? FALLBACK_TIMEOUT_MS
  );
}

function attachRequestContext(data: any): any {
  const ctx = RequestContext.get();
  if (!ctx?.requestId && !ctx?.userId) return data;

  const base =
    data && typeof data === 'object' && !Array.isArray(data)
      ? data
      : { value: data };
  return {
    ...base,
    headers: {
      'x-request-id': ctx.requestId,
      'x-correlation-id': ctx.requestId,
      ...base.headers,
    },
    ...(ctx.userId && base.userId === undefined ? { userId: ctx.userId } : {}),
  };
}

function isConnectionError(error: any): boolean {
  const code = error?.code;
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND')
    return true;

  const message = typeof error === 'string' ? error : error?.message;
  if (!message) return false;

  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ECONNRESET') ||
    message.includes('Connection closed') ||
    message.includes('CONN_STALE') ||
    message.includes('DISCONNECT') ||
    message.includes('Not connected')
  );
}

export function createResilientClient(
  options: ClientOptions,
  serviceName: string,
): ClientProxy {
  const client = ClientProxyFactory.create(options);
  const rawSend = client.send.bind(client);
  const rawEmit = client.emit.bind(client);
  const timeoutMs = resolveTimeoutMs(serviceName);

  client.send = (pattern: any, data: any): Observable<any> => {
    return rawSend(pattern, attachRequestContext(data)).pipe(
      rxTimeout(timeoutMs),
      retry({
        count: CONNECTION_ERROR_RETRY_ATTEMPTS,
        delay: (error, attempt) =>
          isConnectionError(error)
            ? timer(CONNECTION_ERROR_RETRY_BASE_DELAY_MS * attempt)
            : throwError(() => error),
      }),
    );
  };

  client.emit = (pattern: any, data: any): Observable<any> => {
    return rawEmit(pattern, attachRequestContext(data));
  };

  return client;
}
