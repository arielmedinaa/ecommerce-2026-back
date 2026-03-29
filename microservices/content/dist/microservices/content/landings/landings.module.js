"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingsModule = void 0;
const common_1 = require("@nestjs/common");
const mariadb_module_1 = require("../config/mariadb.module");
const landings_controller_1 = require("./controller/landings.controller");
const landings_service_1 = require("./service/landings.service");
const landings_service_spec_1 = require("./service/landings.service.spec");
const landings_error_service_1 = require("./service/errors/landings-error.service");
const microservice_module_1 = require("../../../shared/config/microservice/microservice.module");
let LandingsModule = class LandingsModule {
};
exports.LandingsModule = LandingsModule;
exports.LandingsModule = LandingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservice_module_1.MicroserviceModule.register('CONTENT'),
            mariadb_module_1.MariaDbModule.forFeature(),
            mariadb_module_1.MariaDbModule.forFeatureRead(),
        ],
        controllers: [landings_controller_1.LandingsController],
        providers: [
            landings_service_1.LandingsService,
            landings_service_spec_1.LandingValidationService,
            landings_error_service_1.LandingErrorService,
        ],
        exports: [
            landings_service_1.LandingsService,
            landings_service_spec_1.LandingValidationService,
            landings_error_service_1.LandingErrorService,
        ],
    })
], LandingsModule);
//# sourceMappingURL=landings.module.js.map