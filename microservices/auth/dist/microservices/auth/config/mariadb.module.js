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
const user_schemas_1 = require("../schemas/user.schemas");
const mariadb_connection_service_1 = require("./mariadb-connection.service");
const user_coupon_schema_1 = require("../schemas/user-coupon.schema");
const user_track_schema_1 = require("../schemas/user-track.schema");
let MariaDbModule = class MariaDbModule {
};
exports.MariaDbModule = MariaDbModule;
exports.MariaDbModule = MariaDbModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DATABASE_HOST'),
                    port: configService.get('DATABASE_PORT', 3306),
                    username: configService.get('DATABASE_USER'),
                    password: configService.get('DATABASE_PASSWORD'),
                    database: configService.get('DATABASE_NAME'),
                    entities: [user_schemas_1.User, user_coupon_schema_1.UserCoupon, user_track_schema_1.UserTrack],
                    synchronize: process.env.SYNCRONICE === 'true',
                    logging: process.env.SYNCRONICE === 'true',
                    keepConnectionAlive: true,
                    retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS || 10),
                    retryDelay: Number(process.env.DB_RETRY_DELAY_MS || 3000),
                    extra: {
                        connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            typeorm_1.TypeOrmModule.forFeature([user_schemas_1.User, user_coupon_schema_1.UserCoupon, user_track_schema_1.UserTrack]),
        ],
        providers: [mariadb_connection_service_1.MariaDbConnectionService],
        exports: [typeorm_1.TypeOrmModule],
    })
], MariaDbModule);
//# sourceMappingURL=mariadb.module.js.map