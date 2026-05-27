import { NestFactory } from "@nestjs/core";
import { ImageModule } from "./image.module";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { SERVICE_PORTS } from "@shared/config/microservice/microservice.config"; 
import { JsonLogger } from "@shared/common/logging/json-logger";
import { RpcRequestContextInterceptor } from "@shared/common/interceptors/rpc-request-context.interceptor";

async function bootstrap() {
    const app = await NestFactory.create(ImageModule, {
      abortOnError: false,
      logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('image') : undefined,
    });
    app.useGlobalInterceptors(new RpcRequestContextInterceptor());
    const configService = app.get(ConfigService);
    const port = configService.get<number>('IMAGE_PORT', SERVICE_PORTS.IMAGE);

    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: port,
      },
    });

    await app.startAllMicroservices();
    
    const httpPort = process.env.IMAGE_HTTP_PORT || 4093;
    await app.listen(httpPort, '0.0.0.0');
    
    console.log(`Image microservice running on TCP port ${port}`);
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
