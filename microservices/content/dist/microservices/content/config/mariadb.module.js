"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MariaDbModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const verticales_schemas_1 = require("../verticales/schemas/verticales.schemas");
const landings_schemas_1 = require("../landings/schemas/landings.schemas");
const formatos_schema_1 = require("../landings/schemas/formatos.schema");
const landings_error_schema_1 = require("../landings/schemas/errors/landings.error.schema");
const cupon_schema_1 = require("../cupones/schemas/cupon.schema");
const event_schema_1 = require("../events/schemas/event.schema");
const event_product_schema_1 = require("../events/schemas/event-product.schema");
const order_schema_1 = require("../events/schemas/order.schema");
const order_item_schema_1 = require("../events/schemas/order-item.schema");
const event_condition_schema_1 = require("../events/schemas/event-condition.schema");
let MariaDbModule = class MariaDbModule {
    static forWrite() {
        return typeorm_1.TypeOrmModule.forRootAsync({
            imports: [config_1.ConfigModule],
            name: 'WRITE_CONNECTION',
            useFactory: (configService) => ({
                type: 'mysql',
                host: configService.get('DATABASE_HOST'),
                port: configService.get('DATABASE_PORT'),
                username: configService.get('DATABASE_USER'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                entities: [
                    verticales_schemas_1.Vertical,
                    landings_schemas_1.Landing,
                    formatos_schema_1.Formato,
                    landings_error_schema_1.LandingError,
                    cupon_schema_1.Cupon,
                    event_schema_1.Event,
                    event_product_schema_1.EventProduct,
                    order_schema_1.Order,
                    order_item_schema_1.OrderItem,
                    event_condition_schema_1.EventCondition,
                ],
                synchronize: true,
                logging: false,
                timezone: '-03:00',
                charset: 'utf8mb4',
            }),
            inject: [config_1.ConfigService],
        });
    }
    static forRead() {
        return typeorm_1.TypeOrmModule.forRootAsync({
            imports: [config_1.ConfigModule],
            name: 'READ_CONNECTION',
            useFactory: (configService) => ({
                type: 'mysql',
                host: configService.get('DATABASE_HOST_REPLIC'),
                port: configService.get('DATABASE_PORT_REPLIC'),
                username: configService.get('DATABASE_USER_REPLIC'),
                password: configService.get('DATABASE_PASSWORD_REPLIC'),
                database: configService.get('DATABASE_NAME_REPLIC'),
                entities: [
                    verticales_schemas_1.Vertical,
                    landings_schemas_1.Landing,
                    formatos_schema_1.Formato,
                    landings_error_schema_1.LandingError,
                    cupon_schema_1.Cupon,
                    event_schema_1.Event,
                    event_product_schema_1.EventProduct,
                    order_schema_1.Order,
                    order_item_schema_1.OrderItem,
                    event_condition_schema_1.EventCondition,
                ],
                synchronize: true,
                logging: false,
                timezone: '-03:00',
                charset: 'utf8mb4',
            }),
            inject: [config_1.ConfigService],
        });
    }
    static forFeature() {
        return typeorm_1.TypeOrmModule.forFeature([
            verticales_schemas_1.Vertical,
            landings_schemas_1.Landing,
            formatos_schema_1.Formato,
            landings_error_schema_1.LandingError,
            cupon_schema_1.Cupon,
            event_schema_1.Event,
            event_product_schema_1.EventProduct,
            order_schema_1.Order,
            order_item_schema_1.OrderItem,
            event_condition_schema_1.EventCondition,
        ], 'WRITE_CONNECTION');
    }
    static forFeatureRead() {
        return typeorm_1.TypeOrmModule.forFeature([
            verticales_schemas_1.Vertical,
            landings_schemas_1.Landing,
            formatos_schema_1.Formato,
            landings_error_schema_1.LandingError,
            cupon_schema_1.Cupon,
            event_schema_1.Event,
            event_product_schema_1.EventProduct,
            order_schema_1.Order,
            order_item_schema_1.OrderItem,
            event_condition_schema_1.EventCondition,
        ], 'READ_CONNECTION');
    }
};
exports.MariaDbModule = MariaDbModule;
exports.MariaDbModule = MariaDbModule = __decorate([
    (0, common_1.Module)({
        imports: [
            MariaDbModule.forWrite(),
            MariaDbModule.forRead(),
            MariaDbModule.forFeature(),
            MariaDbModule.forFeatureRead(),
        ],
        exports: [typeorm_1.TypeOrmModule],
    })
], MariaDbModule);
//# sourceMappingURL=mariadb.module.js.map