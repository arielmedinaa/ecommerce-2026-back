"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const auth_module_1 = require("./auth.module");
const common_1 = require("@nestjs/common");
const microservice_config_1 = require("@shared/config/microservice/microservice.config");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(auth_module_1.AuthModule);
    const configService = app.get(config_1.ConfigService);
    const microservicePort = configService.get('AUTH_PORT', microservice_config_1.SERVICE_PORTS.AUTH);
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
            port: microservicePort,
        },
    });
    await app.startAllMicroservices();
    const httpPort = 3001;
    await app.listen(httpPort);
    const logger = new common_1.Logger('AuthMicroservice');
    logger.log(`Auth microservice is running on HTTP port ${httpPort}`);
    logger.log(`Microservice is listening on TCP host ${process.env.AUTH_SERVICE_HOST || 'localhost'} port ${microservicePort}`);
}
bootstrap().catch(err => {
    console.error('Error starting auth microservice:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map