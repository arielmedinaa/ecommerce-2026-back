import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable, throwError, timer } from 'rxjs';
import { retryWhen, delay, take, mergeMap, timeout as rxTimeout } from 'rxjs/operators';
import { CircuitBreaker } from './circuit-breaker.decorator';

export interface ResilientOptions {
  retries?: number;
  delay?: number;
  fallback?: () => Promise<any>;
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeout?: number;
  };
  timeoutMs?: number;
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
      timeoutMs = 10000,
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
        return this.executeWithRetry(client, pattern, data, retries, retryDelay, timeoutMs);
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
    timeoutMs: number,
  ): Promise<T> {
    try {
      const response = client.send(pattern, data).pipe(rxTimeout(timeoutMs));
      const result = await firstValueFrom(response);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to execute command ${pattern.cmd} (timeout ${timeoutMs}ms):`,
        error.message,
      );
      this.logger.error(`Full error details:`, error.stack || error);
      throw error;
    }
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
