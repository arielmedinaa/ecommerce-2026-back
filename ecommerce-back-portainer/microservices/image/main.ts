import { NestFactory } from "@nestjs/core";
import { ImageModule } from "./image.module";
import { ConfigService } from "@nestjs/config";
import { SERVICE_PORTS, getNatsServerOptions } from "@shared/config/microservice/microservice.config";
import { JsonLogger } from "@shared/common/logging/json-logger";
import { RpcRequestContextInterceptor } from "@shared/common/interceptors/rpc-request-context.interceptor";
import { ResponseTransformInterceptor } from "@shared/common/interceptors/response-transform.interceptor";

async function bootstrap() {
    const app = await NestFactory.create(ImageModule, {
      abortOnError: false,
      logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('image') : undefined,
    });
    app.useGlobalInterceptors(new RpcRequestContextInterceptor(), new ResponseTransformInterceptor());
    const configService = app.get(ConfigService);
    const port = configService.get<number>('IMAGE_PORT', SERVICE_PORTS.IMAGE);

    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    app.connectMicroservice(getNatsServerOptions('IMAGE_SERVICE'), { inheritAppConfig: true });

    await app.startAllMicroservices();

    const httpPort = process.env.IMAGE_HTTP_PORT || 4093;
    await app.listen(httpPort, '0.0.0.0');

    console.log(`Image microservice running (NATS, queue group IMAGE_SERVICE_QUEUE; http port hint ${port})`);
    console.log(`HTTP server listening on port ${httpPort}`);
    console.log(`Image endpoints available at: http://localhost:${httpPort}/controllerImageApi/image/`);
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
        `Image bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

bootstrapWithRetry();
