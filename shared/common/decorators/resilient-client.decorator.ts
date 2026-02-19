import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable, throwError, timer } from 'rxjs';
import { retryWhen, delay, take, mergeMap } from 'rxjs/operators';
import { CircuitBreaker } from './circuit-breaker.decorator';

export interface ResilientOptions {
  retries?: number;
  delay?: number;
  fallback?: () => Promise<any>;
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeout?: number;
  };
}

@Injectable()
export class ResilientService {
  private readonly logger = new Logger(ResilientService.name);
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor() {}

  async sendWithResilience<T>(
    client: ClientProxy,
    pattern: any,
    data: any,
    options: ResilientOptions = {},
  ): Promise<T> {
    const {
      retries = 3,
      delay: retryDelay = 1000,
      fallback,
      circuitBreaker: cbOptions = {},
    } = options;

    const serviceKey = pattern.cmd || JSON.stringify(pattern);
    
    if (!this.circuitBreakers.has(serviceKey)) {
      this.circuitBreakers.set(
        serviceKey,
        new CircuitBreaker({
          failureThreshold: cbOptions.failureThreshold || 5,
          resetTimeout: cbOptions.resetTimeout || 30000,
        }),
      );
    }

    const circuitBreaker = this.circuitBreakers.get(serviceKey)!;

    return circuitBreaker.execute(
      async () => {
        return this.executeWithRetry(client, pattern, data, retries, retryDelay);
      },
      fallback,
    );
  }

  private async executeWithRetry<T>(
    client: ClientProxy,
    pattern: any,
    data: any,
    retries: number,
    delay: number,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        this.createRetryObservable(client.send(pattern, data), retries, delay),
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute command ${pattern.cmd} after ${retries} retries:`,
        error.message,
      );
      throw error;
    }
  }

  private createRetryObservable<T>(
    observable: Observable<T>,
    retries: number,
    retryDelay: number,
  ): Observable<T> {
    if (retries <= 0) return observable;

    return observable.pipe(
      retryWhen((errors) =>
        errors.pipe(
          delay(retryDelay),
          take(retries),
          mergeMap((error: any, index: number) => {
            this.logger.warn(
              `Retry attempt ${index + 1}/${retries} for error: ${error.message}`,
            );
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  getCircuitBreakerStates() {
    const states: Record<string, any> = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      states[key] = breaker.getState();
    }
    return states;
  }

  resetCircuitBreaker(serviceKey: string) {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (breaker) {
      this.circuitBreakers.delete(serviceKey);
      this.logger.log(`Circuit breaker reset for service: ${serviceKey}`);
    }
  }
}
