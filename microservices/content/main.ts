import { HomeModule } from '@home/home.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SERVICE_PORTS } from '@shared/config/microservice/microservice.config';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(HomeModule);
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

bootstrap().catch((err) => {
  console.error('Error al iniciar el servicio de contenido:', err);
  process.exit(1);
});
