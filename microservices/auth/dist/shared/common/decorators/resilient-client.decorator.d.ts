import { ClientProxy } from '@nestjs/microservices';
export interface ResilientOptions {
    retries?: number;
    delay?: number;
    fallback?: () => Promise<any>;
    circuitBreaker?: {
        failureThreshold?: number;
        resetTimeout?: number;
    };
}
export declare class ResilientService {
    private readonly logger;
    private circuitBreakers;
    constructor();
    sendWithResilience<T>(client: ClientProxy, pattern: any, data: any, options?: ResilientOptions): Promise<T>;
    private executeWithRetry;
    private createRetryObservable;
    getCircuitBreakerStates(): Record<string, any>;
    resetCircuitBreaker(serviceKey: string): void;
}
