"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeModule = void 0;
const common_1 = require("@nestjs/common");
const home_controller_1 = require("./controller/home.controller");
const home_service_1 = require("./service/home.service");
const microservice_module_1 = require("../../../shared/config/microservice/microservice.module");
const resilient_client_decorator_1 = require("../../../shared/common/decorators/resilient-client.decorator");
const fallback_data_service_1 = require("../../../shared/common/services/fallback-data.service");
let HomeModule = class HomeModule {
};
exports.HomeModule = HomeModule;
exports.HomeModule = HomeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservice_module_1.MicroserviceModule.register('CONTENT'),
            microservice_module_1.MicroserviceModule.forRoot([
                'PRODUCTS_SERVICE',
                'IMAGE_SERVICE',
            ]),
        ],
        controllers: [home_controller_1.HomeController],
        providers: [
            home_service_1.HomeService,
            resilient_client_decorator_1.ResilientService,
            fallback_data_service_1.FallbackDataService,
        ],
        exports: [home_service_1.HomeService],
    })
], HomeModule);
//# sourceMappingURL=home.module.js.map