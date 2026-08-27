// Permite requerir en caliente los .ts que el agente genera para cada
// proveedor (viven fuera de lo que compiló `nest build`), sin necesidad de
// un paso de build adicional cada vez que se genera una integración nueva.
require('ts-node/register/transpile-only');

import { NestFactory } from '@nestjs/core';
import { EtlModule } from './etl.module';
import { SERVICE_PORTS, getNatsServerOptions } from '@shared/config/microservice/microservice.config';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { RpcRequestContextInterceptor } from '@shared/common/interceptors/rpc-request-context.interceptor';
import { ResponseTransformInterceptor } from '@shared/common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(EtlModule, {
    abortOnError: false,
    logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('etl') : undefined,
  });
  app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
  const port = Number(process.env.ETL_PORT) || SERVICE_PORTS.ETL;

  app.connectMicroservice(getNatsServerOptions('ETL_SERVICE'), { inheritAppConfig: true });

  await app.startAllMicroservices();
  const server = app.getHttpAdapter();
  await app.listen(port);
  console.log(`ETL service running on port ${port}`);
  console.log(`HTTP server listening on port ${port} via ${server.constructor.name}`);
  console.log(`Microservice configured with NATS transport, queue group ETL_SERVICE_QUEUE`);
}

async function bootstrapWithRetry() {
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      await bootstrap();
      break;
    } catch (err) {
      const delayMs = Math.min(30000, 1000 * attempt);
      console.error(`ETL bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`, err);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
