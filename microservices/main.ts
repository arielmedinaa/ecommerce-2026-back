import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gateway/app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { JsonLogger } from '@shared/common/logging/json-logger';
import { requestIdMiddleware } from '@gateway/common/middlewares/request-id.middleware';
import { HttpLoggingInterceptor } from '@gateway/common/interceptors/http-logging.interceptor';
import { ClientProxy } from '@nestjs/microservices';
import { RequestContext } from '@shared/common/logging/request-context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: process.env.LOG_FORMAT === 'json' ? new JsonLogger('api-gateway') : undefined,
  });
  const configService = app.get(ConfigService);
  const port = configService.get('GATEWAY_PORT') || 3000;

  app.use(compression());
  app.use(requestIdMiddleware);
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  const originalSend = ClientProxy.prototype.send;
  ClientProxy.prototype.send = function (pattern: any, data: any) {
    const ctx = RequestContext.get();
    if (!ctx?.requestId) return originalSend.call(this, pattern, data);
    if (!data || typeof data !== 'object') return originalSend.call(this, pattern, data);

    if (data.headers && (data.headers['x-request-id'] || data.headers['x-correlation-id'])) {
      return originalSend.call(this, pattern, data);
    }

    const nextData = {
      ...data,
      headers: {
        ...(data.headers || {}),
        'x-request-id': ctx.requestId,
      },
      ...(ctx.userId ? { userId: ctx.userId } : {}),
    };
    return originalSend.call(this, pattern, nextData);
  };

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Gateway - Ecommerce')
    .setDescription('API Gateway para el sistema de Ecommerce')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
}

bootstrap();
