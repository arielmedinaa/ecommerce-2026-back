"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModule = void 0;
const common_1 = require("@nestjs/common");
const home_module_1 = require("./home/home.module");
const landings_module_1 = require("./landings/landings.module");
const config_1 = require("@nestjs/config");
const verticales_module_1 = require("./verticales/verticales.module");
const mariadb_module_1 = require("./config/mariadb.module");
const cupones_module_1 = require("./cupones/cupones.module");
const events_module_1 = require("./events/events.module");
let ContentModule = class ContentModule {
};
exports.ContentModule = ContentModule;
exports.ContentModule = ContentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            home_module_1.HomeModule,
            landings_module_1.LandingsModule,
            verticales_module_1.VerticalesModule,
            cupones_module_1.CuponesModule,
            events_module_1.EventsModule,
            mariadb_module_1.MariaDbModule,
        ],
        exports: [home_module_1.HomeModule, landings_module_1.LandingsModule, verticales_module_1.VerticalesModule, events_module_1.EventsModule],
    })
], ContentModule);
//# sourceMappingURL=content.module.js.map