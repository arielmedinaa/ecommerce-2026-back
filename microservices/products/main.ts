import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ProductsModule } from './products.module';
import { Logger } from '@nestjs/common';
import { SERVICE_PORTS } from '../../shared/config/microservice/microservice.config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ProductsModule);
  const configService = app.get(ConfigService);

  const microservicePort = configService.get<number>('PRODUCTS_PORT', SERVICE_PORTS.PRODUCTS);
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.PRODUCTS_SERVICE_HOST || '0.0.0.0',
      port: microservicePort,
    },
  });

  await app.startAllMicroservices();
  const httpPort = 4000;
  await app.listen(httpPort);
  
  const logger = new Logger('ProductsMicroservice');
  logger.log(`Products microservice is running on HTTP port ${httpPort}`);
  logger.log(`Microservice is listening on TCP host ${process.env.PRODUCTS_SERVICE_HOST || 'localhost'} port ${microservicePort}`);
}

bootstrap().catch(err => {
  console.error('Error starting products microservice:', err);
  process.exit(1);
});