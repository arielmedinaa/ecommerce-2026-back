export interface CircuitBreakerOptions {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
}
export declare class CircuitBreaker {
    private options;
    private state;
    private failureCount;
    private lastFailureTime;
    private successCount;
    private readonly logger;
    constructor(options?: CircuitBreakerOptions);
    execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): {
        state: "CLOSED" | "OPEN" | "HALF_OPEN";
        failureCount: number;
        lastFailureTime: number;
    };
}
