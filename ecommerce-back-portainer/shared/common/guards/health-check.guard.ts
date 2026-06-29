import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';

@Injectable()
export class HealthCheckGuard implements CanActivate {
  private readonly logger = new Logger(HealthCheckGuard.name);
  private serviceHealth = new Map<string, { status: 'UP' | 'DOWN'; lastCheck: number; failures: number }>();
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 30000;

  canActivate(context: ExecutionContext): boolean {
    const isRpc = context.getType() === 'rpc';
    if (isRpc) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request) {
      return true;
    }

    const { path, method } = request;
    if (path && (path.includes('/health') || path.includes('/status'))) {
      return true;
    }

    if (path && method && this.isCriticalEndpoint(path, method)) {
      return this.checkServiceHealth(path);
    }

    return true;
  }

  private isCriticalEndpoint(path: string, method: string): boolean {
    const criticalPatterns = [
      { path: '/home', methods: ['GET'] },
      { path: '/products', methods: ['GET'] },
      { path: '/cart', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/orders', methods: ['GET', 'POST'] },
    ];

    return criticalPatterns.some(pattern => 
      path.includes(pattern.path) && pattern.methods.includes(method)
    );
  }

  private checkServiceHealth(path: string): boolean {
    const serviceName = this.extractServiceName(path);
    const health = this.serviceHealth.get(serviceName);

    if (!health) {
      this.serviceHealth.set(serviceName, {
        status: 'UP',
        lastCheck: Date.now(),
        failures: 0,
      });
      return true;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - health.lastCheck;
    if (health.status === 'DOWN') {
      if (timeSinceLastCheck >= this.RECOVERY_TIMEOUT) {
        this.logger.log(`Attempting to recover service: ${serviceName}`);
        this.serviceHealth.set(serviceName, {
          status: 'UP',
          lastCheck: now,
          failures: 0,
        });
        return true;
      } else {
        this.logger.warn(`Service ${serviceName} is still DOWN`);
        return false;
      }
    }

    return true;
  }

  private extractServiceName(path: string): string {
    if (path.includes('/home')) return 'content';
    if (path.includes('/products')) return 'products';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/auth')) return 'auth';
    return 'unknown';
  }

  public reportServiceFailure(serviceName: string) {
    const health = this.serviceHealth.get(serviceName) || {
      status: 'UP' as const,
      lastCheck: Date.now(),
      failures: 0,
    };

    health.failures += 1;
    health.lastCheck = Date.now();

    if (health.failures >= this.FAILURE_THRESHOLD) {
      health.status = 'DOWN';
      this.logger.error(`Service ${serviceName} marked as DOWN after ${health.failures} failures`);
    }

    this.serviceHealth.set(serviceName, health);
  }

  public reportServiceSuccess(serviceName: string) {
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.status = 'UP';
      health.failures = 0;
      health.lastCheck = Date.now();
      this.serviceHealth.set(serviceName, health);
    }
  }

  public getServiceHealth() {
    const health: Record<string, any> = {};
    for (const [service, status] of this.serviceHealth.entries()) {
      health[service] = status;
    }
    return health;
  }

  public resetServiceHealth(serviceName: string) {
    this.serviceHealth.delete(serviceName);
    this.logger.log(`Reset health status for service: ${serviceName}`);
  }
}
