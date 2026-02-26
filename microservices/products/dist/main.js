"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const products_module_1 = require("./products.module");
const common_1 = require("@nestjs/common");
const microservice_config_1 = require("../../shared/config/microservice/microservice.config");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(products_module_1.ProductsModule);
    const configService = app.get(config_1.ConfigService);
    const microservicePort = configService.get('PRODUCTS_PORT', microservice_config_1.SERVICE_PORTS.PRODUCTS);
    const microservice = app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: process.env.PRODUCTS_SERVICE_HOST || '0.0.0.0',
            port: microservicePort,
        },
    });
    await app.startAllMicroservices();
    const httpPort = 4000;
    await app.listen(httpPort);
    const logger = new common_1.Logger('ProductsMicroservice');
    logger.log(`Products microservice is running on HTTP port ${httpPort}`);
    logger.log(`Microservice is listening on TCP host ${process.env.PRODUCTS_SERVICE_HOST || 'localhost'} port ${microservicePort}`);
}
bootstrap().catch(err => {
    console.error('Error starting products microservice:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map