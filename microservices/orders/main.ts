import { NestFactory } from "@nestjs/core";
import { OrdersModule } from "./orders.module";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { SERVICE_PORTS } from "@shared/config/microservice/microservice.config";

async function bootstrap() {
    const app = await NestFactory.create(OrdersModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('ORDERS_PORT', SERVICE_PORTS.ORDERS);

    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: process.env.ORDERS_SERVICE_HOST || '0.0.0.0',
        port: port,
      },
    });

    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    await app.listen(4004);
    console.log(`Orders service running on port ${port}`);
    console.log(`HTTP server listening on port 4004 via ${server.constructor.name}`);
    console.log(`Microservice configured with TCP transport on port ${port}`);
}

bootstrap().catch(err => {
    console.error('Error al iniciar el servicio de órdenes:', err);
    process.exit(1);
});