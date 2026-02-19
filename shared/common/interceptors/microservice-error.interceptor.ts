import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class MicroserviceErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MicroserviceErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();
    if (contextType === 'rpc') {
      return this.handleRpcContext(context, next);
    }
    
    return this.handleHttpContext(context, next);
  }

  private handleRpcContext(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timestamp = new Date().toISOString();
    const pattern = 'RPC_CALL';

    this.logger.log(
      `Incoming RPC Call - ${timestamp}`,
    );

    return next.handle().pipe(
      catchError((error) => {
        const errorMessage = error?.message || 'Unknown error';
        const errorStack = error?.stack || '';

        this.logger.error(
          `Error in RPC call: ${errorMessage}`,
          errorStack,
        );

        this.logErrorDetails({
          method: 'RPC',
          url: pattern,
          ip: 'N/A',
          userAgent: 'N/A',
          timestamp,
          error: {
            message: errorMessage,
            stack: errorStack,
            code: 500,
            name: error?.name || 'Error',
          },
        });

        return throwError(() => this.formatErrorResponse(error));
      }),
    );
  }

  private handleHttpContext(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const timestamp = new Date().toISOString();

    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      catchError((error) => {
        const errorMessage = error?.message || 'Unknown error';
        const errorStack = error?.stack || '';
        const errorCode = error?.status || error?.statusCode || 500;

        this.logger.error(
          `Error in ${method} ${url}: ${errorMessage}`,
          errorStack,
        );

        this.logErrorDetails({
          method,
          url,
          ip,
          userAgent,
          timestamp,
          error: {
            message: errorMessage,
            stack: errorStack,
            code: errorCode,
            name: error?.name || 'Error',
          },
        });
        return throwError(() => this.formatErrorResponse(error));
      }),
    );
  }

  private formatErrorResponse(error: any) {
    const statusCode = error?.status || error?.statusCode || 500;
    const message = this.getUserFriendlyMessage(error);
    
    return {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: error?.path || '',
      ...(process.env.NODE_ENV === 'development' && {
        error: {
          name: error?.name,
          stack: error?.stack,
          originalMessage: error?.message,
        },
      }),
    };
  }

  private getUserFriendlyMessage(error: any): string {
    const errorMappings: Record<string, string> = {
      'ECONNREFUSED': 'Service temporarily unavailable. Please try again later.',
      'ETIMEDOUT': 'Request timed out. Please try again.',
      'ENOTFOUND': 'Service not available. Please check your connection.',
      'Circuit breaker is OPEN': 'Service temporarily unavailable. Please try again later.',
      'MongoServerError': 'Database error. Please try again later.',
      'ValidationError': 'Invalid data provided.',
      'UnauthorizedError': 'Authentication required.',
      'ForbiddenError': 'Access denied.',
    };

    const errorName = error?.name || '';
    const errorMessage = error?.message || '';
    for (const [key, message] of Object.entries(errorMappings)) {
      if (errorMessage.includes(key) || errorName.includes(key)) {
        return message;
      }
    }

    return 'An error occurred. Please try again later.';
  }

  private logErrorDetails(details: any) {
    this.logger.error('Error Details:', JSON.stringify(details, null, 2));
  }
}
