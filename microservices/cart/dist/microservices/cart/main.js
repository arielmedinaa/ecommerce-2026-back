"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const cart_module_1 = require("./cart.module");
const config_1 = require("@nestjs/config");
const microservices_1 = require("@nestjs/microservices");
const microservice_config_1 = require("../../shared/config/microservice/microservice.config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(cart_module_1.CartModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('CART_PORT', microservice_config_1.SERVICE_PORTS.CART);
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
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
//# sourceMappingURL=main.js.map