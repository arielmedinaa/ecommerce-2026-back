"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MicroserviceModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicroserviceModule = exports.getMicroserviceConfig = exports.SERVICE_PORTS = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
exports.SERVICE_PORTS = {
    AUTH_SERVICE: 3101,
    CART_SERVICE: 3102,
    CONTENT_SERVICE: 3103,
    ORDERS_SERVICE: 3104,
    PAYMENTS_SERVICE: 3105,
    PRODUCTS_SERVICE: 3106,
    IMAGE_SERVICE: 3107,
};
const getMicroserviceConfig = (serviceName) => {
    const service = serviceName.toUpperCase();
    const port = Number(process.env[`${service}_PORT`] ||
        exports.SERVICE_PORTS[service] ||
        process.env.PORT ||
        3000);
    const host = process.env.IS_DOCKER
        ? `deploy-${serviceName.replace('_SERVICE', '').toLowerCase()}-1`
        : 'localhost';
    console.log(`Configuring ${service} microservice at ${host}:${port}`);
    return {
        transport: microservices_1.Transport.TCP,
        options: {
            host: host,
            port: port,
        },
    };
};
exports.getMicroserviceConfig = getMicroserviceConfig;
let MicroserviceModule = MicroserviceModule_1 = class MicroserviceModule {
    static register(serviceName) {
        const config = (0, exports.getMicroserviceConfig)(serviceName);
        return {
            module: MicroserviceModule_1,
            imports: [
                microservices_1.ClientsModule.register([
                    {
                        name: serviceName,
                        transport: microservices_1.Transport.TCP,
                        options: config.options,
                    },
                ]),
            ],
            exports: [microservices_1.ClientsModule],
        };
    }
    static forRoot(services) {
        const clientModules = services.map(serviceName => {
            const config = (0, exports.getMicroserviceConfig)(serviceName);
            return {
                name: serviceName,
                transport: microservices_1.Transport.TCP,
                options: {
                    host: config.options.host,
                    port: config.options.port,
                },
            };
        });
        return {
            module: MicroserviceModule_1,
            imports: [
                microservices_1.ClientsModule.register(clientModules),
            ],
            exports: [microservices_1.ClientsModule],
        };
    }
};
exports.MicroserviceModule = MicroserviceModule;
exports.MicroserviceModule = MicroserviceModule = MicroserviceModule_1 = __decorate([
    (0, common_1.Module)({})
], MicroserviceModule);
//# sourceMappingURL=microservice.module.js.map