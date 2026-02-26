"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const payments_module_1 = require("./payments.module");
const config_1 = require("@nestjs/config");
const microservice_config_1 = require("@shared/config/microservice/microservice.config");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(payments_module_1.PaymentModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PAYMENTS_PORT', microservice_config_1.SERVICE_PORTS.PAYMENTS);
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: process.env.PAYMENTS_HOST || '0.0.0.0',
            port,
        },
    });
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
//# sourceMappingURL=main.js.map