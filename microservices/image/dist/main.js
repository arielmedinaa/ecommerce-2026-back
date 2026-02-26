"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const image_module_1 = require("./image.module");
const config_1 = require("@nestjs/config");
const microservices_1 = require("@nestjs/microservices");
const microservice_config_1 = require("@shared/config/microservice/microservice.config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(image_module_1.ImageModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('IMAGE_PORT', microservice_config_1.SERVICE_PORTS.IMAGE);
    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: process.env.IS_DOCKER ? '0.0.0.0' : 'localhost',
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
bootstrap().catch(err => {
    console.error('Error al iniciar el servicio de imágenes:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map