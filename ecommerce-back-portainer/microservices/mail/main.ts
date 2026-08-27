import { NestFactory } from '@nestjs/core';
import { MailModule } from './mail.module';
import { SERVICE_PORTS, getNatsServerOptions } from '@shared/config/microservice/microservice.config';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { RpcRequestContextInterceptor } from '@shared/common/interceptors/rpc-request-context.interceptor';
import { ResponseTransformInterceptor } from '@shared/common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(MailModule, {
    abortOnError: false,
    logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('mail') : undefined,
  });
  app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
  const port = Number(process.env.MAIL_PORT) || SERVICE_PORTS.MAIL;

  app.connectMicroservice(getNatsServerOptions('MAIL_SERVICE'), { inheritAppConfig: true });

  await app.startAllMicroservices();
  const server = app.getHttpAdapter();
  await app.listen(4008);
  console.log(`Mail service running (http port hint ${port})`);
  console.log(`HTTP server listening on port 4008 via ${server.constructor.name}`);
  console.log(`Microservice configured with NATS transport, queue group MAIL_SERVICE_QUEUE`);
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

      console.error(
        `Mail bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
