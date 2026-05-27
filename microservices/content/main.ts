import { ContentModule } from './content.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SERVICE_PORTS } from '@shared/config/microservice/microservice.config';
import { Transport } from '@nestjs/microservices';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { RpcRequestContextInterceptor } from '@shared/common/interceptors/rpc-request-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(ContentModule, {
    abortOnError: false,
    logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('content') : undefined,
  });
  app.useGlobalInterceptors(new RpcRequestContextInterceptor());
  const configService = app.get(ConfigService);
  const port = configService.get<number>('CONTENT_PORT', SERVICE_PORTS.CONTENT);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  await app.startAllMicroservices();
  const server = app.getHttpAdapter();
  console.log(`Content service running on port ${port}`);
  console.log(
    `HTTP server listening on port ${port} via ${server.constructor.name}`,
  );
  console.log(`Microservice configured with TCP transport on port ${port}`);
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
        `Content bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
