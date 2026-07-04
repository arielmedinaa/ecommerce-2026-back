"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNatsServerOptions = exports.getNatsServers = exports.SERVICE_PORTS = exports.getMicroserviceConfig = void 0;
const microservices_1 = require("@nestjs/microservices");
const getMicroserviceConfig = (serviceName, port) => ({
    transport: microservices_1.Transport.TCP,
    options: {
        host: '0.0.0.0',
        port,
    },
    name: serviceName.toUpperCase(),
});
exports.getMicroserviceConfig = getMicroserviceConfig;
exports.SERVICE_PORTS = {
    AUTH: 3101,
    CART: 3102,
    CONTENT: 3103,
    ORDERS: 3104,
    PAYMENTS: 3105,
    PRODUCTS: 3106,
    IMAGE: 3107,
};
const getNatsServers = () => [
    process.env.NATS_URL || 'nats://nats:4222',
];
exports.getNatsServers = getNatsServers;
const getNatsServerOptions = (serviceName) => ({
    transport: microservices_1.Transport.NATS,
    options: {
        servers: (0, exports.getNatsServers)(),
        queue: `${serviceName.toUpperCase()}_QUEUE`,
    },
});
exports.getNatsServerOptions = getNatsServerOptions;
//# sourceMappingURL=microservice.config.js.map