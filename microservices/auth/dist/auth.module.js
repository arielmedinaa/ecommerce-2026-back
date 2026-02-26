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
const mongoose_1 = require("@nestjs/mongoose");
const user_schema_1 = require("./schemas/user.schema");
const guest_token_schema_1 = require("./schemas/guest-token.schema");
const database_module_1 = require("@shared/config/database/database.module");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const google_strategy_1 = require("./strategies/google.strategy");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule.forRoot(),
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: guest_token_schema_1.GuestToken.name, schema: guest_token_schema_1.GuestTokenSchema },
            ]),
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'default-secret',
                signOptions: { expiresIn: '7d' },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, guest_service_1.GuestService, google_strategy_1.GoogleStrategy, jwt_strategy_1.JwtStrategy],
        exports: [auth_service_1.AuthService, guest_service_1.GuestService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map