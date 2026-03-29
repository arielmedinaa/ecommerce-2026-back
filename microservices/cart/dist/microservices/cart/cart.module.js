"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModule = void 0;
const common_1 = require("@nestjs/common");
const cart_service_1 = require("./service/cart.service");
const cart_error_service_1 = require("./service/errors/cart-error.service");
const cart_service_spec_1 = require("./service/cart.service.spec");
const cart_controller_1 = require("./controller/cart.controller");
const jwt_1 = require("@nestjs/jwt");
const microservice_module_1 = require("../../shared/config/microservice/microservice.module");
const core_1 = require("@nestjs/core");
const error_logging_interceptor_1 = require("./interceptors/error-logging.interceptor");
const resilient_client_decorator_1 = require("../../shared/common/decorators/resilient-client.decorator");
const cache_persistente_service_1 = require("../../shared/common/services/cache-persistente.service");
const mariadb_module_1 = require("./config/mariadb.module");
let CartModule = class CartModule {
};
exports.CartModule = CartModule;
exports.CartModule = CartModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: '1d' },
            }),
            mariadb_module_1.MariaDbModule.forWrite(),
            mariadb_module_1.MariaDbModule.forRead(),
            mariadb_module_1.MariaDbModule.forFeature(),
            mariadb_module_1.MariaDbModule.forFeatureRead(),
            microservice_module_1.MicroserviceModule.forRoot([
                'PRODUCTS_SERVICE',
                'PAYMENTS_SERVICE',
                'CONTENT_SERVICE',
            ]),
        ],
        controllers: [cart_controller_1.CartController],
        providers: [
            cart_service_1.CartContadoService,
            cart_error_service_1.CartErrorService,
            cart_service_spec_1.CartValidationService,
            resilient_client_decorator_1.ResilientService,
            cache_persistente_service_1.CachePersistenteService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: error_logging_interceptor_1.ErrorLoggingInterceptor,
            },
        ],
        exports: [cart_service_1.CartContadoService, cart_error_service_1.CartErrorService, cart_service_spec_1.CartValidationService],
    })
], CartModule);
//# sourceMappingURL=cart.module.js.map