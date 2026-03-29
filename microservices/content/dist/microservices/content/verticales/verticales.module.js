"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerticalesModule = void 0;
const common_1 = require("@nestjs/common");
const verticales_controller_1 = require("./controller/verticales.controller");
const mariadb_module_1 = require("../config/mariadb.module");
const verticales_service_1 = require("./service/verticales.service");
const vertical_validation_1 = require("./service/valid/vertical.validation");
let VerticalesModule = class VerticalesModule {
};
exports.VerticalesModule = VerticalesModule;
exports.VerticalesModule = VerticalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mariadb_module_1.MariaDbModule.forFeature(),
            mariadb_module_1.MariaDbModule.forFeatureRead()
        ],
        controllers: [verticales_controller_1.VerticalController],
        providers: [verticales_service_1.VerticalesService, vertical_validation_1.VerticalValidation],
        exports: [verticales_service_1.VerticalesService, vertical_validation_1.VerticalValidation],
    })
], VerticalesModule);
//# sourceMappingURL=verticales.module.js.map