import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ProductsModule } from './products.module';
import { Logger } from '@nestjs/common';
import { SERVICE_PORTS, getNatsServerOptions } from '@shared/config/microservice/microservice.config';
import { ConfigService } from '@nestjs/config';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { RpcRequestContextInterceptor } from '@shared/common/interceptors/rpc-request-context.interceptor';
import { ResponseTransformInterceptor } from '@shared/common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(ProductsModule, {
    abortOnError: false,
    logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('products') : undefined,
  });
  app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
  const configService = app.get(ConfigService);
  const microservicePort = configService.get<number>('PRODUCTS_PORT', SERVICE_PORTS.PRODUCTS);
  
  app.connectMicroservice<MicroserviceOptions>(
    getNatsServerOptions('PRODUCTS_SERVICE'),
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  const httpPort = 4000;
  await app.listen(httpPort);

  const logger = new Logger('ProductsMicroservice');
  logger.log(`Products microservice is running on HTTP port ${httpPort}`);
  logger.log(`Microservice (NATS) listening, queue group PRODUCTS_SERVICE_QUEUE (http port hint ${microservicePort})`);
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
        `Products bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
