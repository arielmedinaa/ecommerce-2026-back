"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsModule = void 0;
const common_1 = require("@nestjs/common");
const events_controller_1 = require("./controller/events.controller");
const events_service_1 = require("./service/events.service");
const mariadb_module_1 = require("../config/mariadb.module");
const conditions_module_1 = require("./conditions/conditions.module");
const microservice_module_1 = require("../../../shared/config/microservice/microservice.module");
let EventsModule = class EventsModule {
};
exports.EventsModule = EventsModule;
exports.EventsModule = EventsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mariadb_module_1.MariaDbModule.forFeature(),
            mariadb_module_1.MariaDbModule.forFeatureRead(),
            conditions_module_1.ConditionsModule,
            microservice_module_1.MicroserviceModule.register('CONTENT'),
            microservice_module_1.MicroserviceModule.forRoot(['AUTH_SERVICE']),
        ],
        controllers: [events_controller_1.EventsController],
        providers: [events_service_1.EventsService],
        exports: [events_service_1.EventsService],
    })
], EventsModule);
//# sourceMappingURL=events.module.js.map