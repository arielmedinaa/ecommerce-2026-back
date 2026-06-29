import { NestFactory } from "@nestjs/core";
import { CartModule } from "./cart.module";
import { ConfigService } from "@nestjs/config";
import { SERVICE_PORTS, getNatsServerOptions } from "@shared/config/microservice/microservice.config";
import { JsonLogger } from "@shared/common/logging/json-logger";
import { RpcRequestContextInterceptor } from "@shared/common/interceptors/rpc-request-context.interceptor";
import { ResponseTransformInterceptor } from "@shared/common/interceptors/response-transform.interceptor";

async function bootstrap() {
    const app = await NestFactory.create(CartModule, {
      abortOnError: false,
      logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('cart') : undefined,
    });
    app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
    const configService = app.get(ConfigService);
    const port = configService.get<number>('CART_PORT', SERVICE_PORTS.CART);

    app.connectMicroservice(getNatsServerOptions('CART_SERVICE'), { inheritAppConfig: true });

    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    await app.listen(4002);
    console.log(`Carts service running (http port hint ${port})`);
    console.log(`HTTP server listening on port 4002 via ${server.constructor.name}`);
    console.log(`Microservice configured with NATS transport, queue group CART_SERVICE_QUEUE`);
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
        `Cart bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
