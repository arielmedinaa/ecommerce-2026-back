import { NestFactory } from "@nestjs/core";
import { CartModule } from "./cart.module";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { SERVICE_PORTS } from "@shared/config/microservice/microservice.config"; 

async function bootstrap() {
    const app = await NestFactory.create(CartModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('CART_PORT', SERVICE_PORTS.CART);

    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: process.env.CARTS_SERVICE_HOST || '0.0.0.0',
        port: port,
      },
    });

    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    await app.listen(4002);
    console.log(`Carts service running on port ${port}`);
    console.log(`HTTP server listening on port 4002 via ${server.constructor.name}`);
    console.log(`Microservice configured with TCP transport on port ${port}`);
}

bootstrap().catch(err => {
    console.error('Error al iniciar el servicio de carrito:', err);
    process.exit(1);
});