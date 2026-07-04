"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./controller/auth.controller");
const auth_service_1 = require("./service/auth.service");
const guest_service_1 = require("./service/guest.service");
const user_coupon_service_1 = require("./service/user-coupon.service");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const google_strategy_1 = require("./strategies/google.strategy");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const mariadb_module_1 = require("./config/mariadb.module");
const config_1 = require("@nestjs/config");
const microservice_module_1 = require("../../shared/config/microservice/microservice.module");
const resilient_client_decorator_1 = require("../../shared/common/decorators/resilient-client.decorator");
const user_controller_1 = require("./controller/user.controller");
const user_service_1 = require("./service/user.service");
const erp_cliente_service_1 = require("./service/erp-cliente.service");
const econt_database_module_1 = require("../../shared/config/database/econt.database.module");
const user_track_service_1 = require("./service/user-track.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mariadb_module_1.MariaDbModule,
            econt_database_module_1.EcontDatabaseModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'default-secret',
                signOptions: { expiresIn: '7d' },
            }),
            microservice_module_1.MicroserviceModule.forRoot([
                'CONTENT_SERVICE',
            ]),
        ],
        controllers: [auth_controller_1.AuthController, user_controller_1.UserController],
        providers: [auth_service_1.AuthService, user_service_1.UserService, guest_service_1.GuestService, user_coupon_service_1.UserCouponService, google_strategy_1.GoogleStrategy, jwt_strategy_1.JwtStrategy, resilient_client_decorator_1.ResilientService, erp_cliente_service_1.ErpClienteService, user_track_service_1.UserTrackService],
        exports: [auth_service_1.AuthService, guest_service_1.GuestService, user_coupon_service_1.UserCouponService, user_service_1.UserService, erp_cliente_service_1.ErpClienteService, user_track_service_1.UserTrackService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map