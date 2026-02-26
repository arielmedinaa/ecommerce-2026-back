"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_module_1 = require("./content.module");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const microservice_config_1 = require("@shared/config/microservice/microservice.config");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(content_module_1.ContentModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('CONTENT_PORT', microservice_config_1.SERVICE_PORTS.CONTENT);
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: port,
        },
    });
    await app.startAllMicroservices();
    const server = app.getHttpAdapter();
    console.log(`Content service running on port ${port}`);
    console.log(`HTTP server listening on port ${port} via ${server.constructor.name}`);
    console.log(`Microservice configured with TCP transport on port ${port}`);
}
bootstrap().catch((err) => {
    console.error('Error al iniciar el servicio de contenido:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map