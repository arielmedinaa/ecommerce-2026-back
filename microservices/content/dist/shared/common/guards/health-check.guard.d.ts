import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class HealthCheckGuard implements CanActivate {
    private readonly logger;
    private serviceHealth;
    private readonly FAILURE_THRESHOLD;
    private readonly RECOVERY_TIMEOUT;
    canActivate(context: ExecutionContext): boolean;
    private isCriticalEndpoint;
    private checkServiceHealth;
    private extractServiceName;
    reportServiceFailure(serviceName: string): void;
    reportServiceSuccess(serviceName: string): void;
    getServiceHealth(): Record<string, any>;
    resetServiceHealth(serviceName: string): void;
}
