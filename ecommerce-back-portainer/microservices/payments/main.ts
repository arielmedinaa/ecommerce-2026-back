
import { NestFactory } from "@nestjs/core";
import { PaymentModule } from "./payments.module";
import { ConfigService } from "@nestjs/config";
import { SERVICE_PORTS, getNatsServerOptions } from "@shared/config/microservice/microservice.config";
import { JsonLogger } from "@shared/common/logging/json-logger";
import { RpcRequestContextInterceptor } from "@shared/common/interceptors/rpc-request-context.interceptor";
import { ResponseTransformInterceptor } from "@shared/common/interceptors/response-transform.interceptor";
import { PaymentsSqsWorker } from "./worker/payments.sqs.worker";

async function bootstrap() {
    const app = await NestFactory.create(PaymentModule, {
      abortOnError: false,
      logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('payments') : undefined,
    });
    app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PAYMENTS_PORT', SERVICE_PORTS.PAYMENTS);

    app.connectMicroservice(getNatsServerOptions('PAYMENTS_SERVICE'), { inheritAppConfig: true });
    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    await app.listen(4008);

    // Start SQS worker (LocalStack/AWS)
    try {
      await app.get(PaymentsSqsWorker).start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to start PaymentsSqsWorker', e);
    }

    console.log(`Payments service running (http port hint ${port})`);
    console.log(`HTTP server listening on port 4008 via ${server.constructor.name}`);
    console.log(`Microservice configured with NATS transport, queue group PAYMENTS_SERVICE_QUEUE`);
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
        `Payments bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
