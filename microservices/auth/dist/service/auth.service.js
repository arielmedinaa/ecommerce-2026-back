"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
const jwt_1 = require("@nestjs/jwt");
let AuthService = AuthService_1 = class AuthService {
    constructor(userModel, jwtService) {
        this.userModel = userModel;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async validateGoogleUser(profile) {
        const { providerId, email, name, avatar } = profile;
        let user = await this.userModel.findOne({ providerId, provider: 'google' });
        if (!user) {
            user = await this.userModel.create({
                email,
                name,
                avatar,
                provider: 'google',
                providerId,
                lastLoginAt: new Date(),
            });
            this.logger.log(`Created new Google user: ${email}`);
        }
        else {
            user.lastLoginAt = new Date();
            await user.save();
        }
        return user;
    }
    async login(user) {
        const payload = {
            sub: user._id,
            email: user.email,
            provider: user.provider,
            name: user.name,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                provider: user.provider,
                avatar: user.avatar,
            },
        };
    }
    async extractTokenFromContext(context) {
        const request = context.getArgByIndex(1)?.req || context.switchToHttp()?.getRequest();
        if (!request?.headers?.authorization) {
            this.logger.warn('No authorization header found');
            return null;
        }
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
    async validateToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch (error) {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map