import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class MicroserviceErrorInterceptor implements NestInterceptor {
    private readonly logger;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private handleRpcContext;
    private handleHttpContext;
    private formatErrorResponse;
    private getUserFriendlyMessage;
    private logErrorDetails;
}
