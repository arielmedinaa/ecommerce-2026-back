import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import { Logger } from '@nestjs/common';
import { SERVICE_PORTS } from '../../shared/config/microservice/microservice.config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const configService = app.get(ConfigService);
  const microservicePort = configService.get<number>('AUTH_PORT', SERVICE_PORTS.AUTH);
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
      port: microservicePort,
    },
  });

  await app.startAllMicroservices();
  const httpPort = 3001;
  await app.listen(httpPort);
  
  const logger = new Logger('AuthMicroservice');
  logger.log(`Auth microservice is running on HTTP port ${httpPort}`);
  logger.log(`Microservice is listening on TCP host ${process.env.AUTH_SERVICE_HOST || 'localhost'} port ${microservicePort}`);
}

bootstrap().catch(err => {
  console.error('Error starting auth microservice:', err);
  process.exit(1);
});