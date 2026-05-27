import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import { Logger } from '@nestjs/common';
import { SERVICE_PORTS } from '@shared/config/microservice/microservice.config';
import { ConfigService } from '@nestjs/config';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { RpcRequestContextInterceptor } from '@shared/common/interceptors/rpc-request-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, {
    abortOnError: false,
    logger:
      process.env.LOG_FORMAT === 'json' ? new JsonLogger('auth') : undefined,
  });
  app.useGlobalInterceptors(new RpcRequestContextInterceptor());
  const configService = app.get(ConfigService);
  const microservicePort = configService.get<number>('AUTH_PORT', SERVICE_PORTS.AUTH);
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
      port: microservicePort,
    },
  });

  await app.startAllMicroservices();
  const httpPort = 3001;
  await app.listen(httpPort);
  
  const logger = new Logger('AuthMicroservice');
  logger.log(`Auth microservice is running on HTTP port ${httpPort}`);
  logger.log(`Microservice is listening on TCP host ${process.env.AUTH_SERVICE_HOST || 'localhost'} port ${microservicePort}`);
}

async function bootstrapWithRetry() {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      attempt++;
      await bootstrap();
      break;
    } catch (err) {
      const delayMs = Math.min(30000, 1000 * attempt);
      // eslint-disable-next-line no-console
      console.error(
        `Auth bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
