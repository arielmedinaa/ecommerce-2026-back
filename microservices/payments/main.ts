
import { NestFactory } from "@nestjs/core";
import { PaymentModule } from "./payments.module";
import { ConfigService } from "@nestjs/config";
import { SERVICE_PORTS } from "@shared/config/microservice/microservice.config";
import { Transport } from "@nestjs/microservices";

async function bootstrap() {
    const app = await NestFactory.create(PaymentModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PAYMENTS_PORT', SERVICE_PORTS.PAYMENTS);

    app.connectMicroservice({
        transport: Transport.TCP,
        options: {
            host: process.env.PAYMENTS_HOST || '0.0.0.0',
            port,
        },
    })
    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    await app.listen(4008);
    console.log(`Payments service running on port ${port}`);
    console.log(`HTTP server listening on port 4008 via ${server.constructor.name}`);
    console.log(`Microservice configured with TCP transport on port ${port}`);
}

bootstrap().catch(err => {
    console.error('Error al iniciar el servicio de pagos:', err);
    process.exit(1);
});