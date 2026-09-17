import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout as rxTimeout } from 'rxjs/operators';
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

    return circuitBreaker.execute(async () => {
      return this.executeWithRetry(
        client,
        pattern,
        data,
        retries,
        retryDelay,
        timeoutMs,
      );
    }, fallback);
  }

  private async executeWithRetry<T>(
    client: ClientProxy,
    pattern: any,
    data: any,
    retries: number,
    retryDelayMs: number,
    timeoutMs: number,
  ): Promise<T> {
    const maxAttempts = retries + 1;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = client.send(pattern, data).pipe(rxTimeout(timeoutMs));
        return await firstValueFrom(response);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Intento ${attempt}/${maxAttempts} fallido para ${pattern.cmd} (timeout ${timeoutMs}ms): ${error.message}`,
        );

        if (attempt < maxAttempts) {
          await this.wait(retryDelayMs * attempt);
        }
      }
    }

    this.logger.error(
      `Todos los intentos (${maxAttempts}) fallaron para ${pattern.cmd}`,
      lastError?.stack || lastError,
    );
    throw lastError;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
