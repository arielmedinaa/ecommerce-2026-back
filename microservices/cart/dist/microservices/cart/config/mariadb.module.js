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
const cart_schemas_1 = require("../schemas/cart.schemas");
const llave_schemas_1 = require("../schemas/llave.schemas");
const transaccion_schemas_1 = require("../schemas/transaccion.schemas");
const order_schemas_1 = require("../schemas/order.schemas");
const order_item_schemas_1 = require("../schemas/order-item.schemas");
const cart_error_entity_1 = require("../schemas/errors/cart-error.entity");
const mariadb_connection_service_1 = require("./mariadb-connection.service");
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
                entities: [cart_schemas_1.Cart, llave_schemas_1.Llave, transaccion_schemas_1.Transaccion, order_schemas_1.Order, order_item_schemas_1.OrderItem, cart_error_entity_1.CartError],
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
                entities: [cart_schemas_1.Cart, llave_schemas_1.Llave, transaccion_schemas_1.Transaccion, order_schemas_1.Order, order_item_schemas_1.OrderItem, cart_error_entity_1.CartError],
                synchronize: true,
                logging: false,
                timezone: '-03:00',
                charset: 'utf8mb4',
            }),
            inject: [config_1.ConfigService],
        });
    }
    static forFeature() {
        return typeorm_1.TypeOrmModule.forFeature([cart_schemas_1.Cart, llave_schemas_1.Llave, transaccion_schemas_1.Transaccion, order_schemas_1.Order, order_item_schemas_1.OrderItem, cart_error_entity_1.CartError], 'WRITE_CONNECTION');
    }
    static forFeatureRead() {
        return typeorm_1.TypeOrmModule.forFeature([cart_schemas_1.Cart, llave_schemas_1.Llave, transaccion_schemas_1.Transaccion, order_schemas_1.Order, order_item_schemas_1.OrderItem, cart_error_entity_1.CartError], 'READ_CONNECTION');
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
        providers: [mariadb_connection_service_1.MariaDbConnectionService],
        exports: [typeorm_1.TypeOrmModule],
    })
], MariaDbModule);
//# sourceMappingURL=mariadb.module.js.map