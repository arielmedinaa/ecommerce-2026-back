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
var GuestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
const guest_token_schema_1 = require("../schemas/guest-token.schema");
const crypto = require("crypto");
let GuestService = GuestService_1 = class GuestService {
    constructor(guestTokenModel, userModel) {
        this.guestTokenModel = guestTokenModel;
        this.userModel = userModel;
        this.logger = new common_1.Logger(GuestService_1.name);
    }
    async createGuestToken(ipAddress, userAgent) {
        const token = crypto.randomBytes(32).toString('hex');
        const existingGuest = await this.guestTokenModel.findOne({
            ipAddress,
            userAgent,
            isActive: true,
        });
        if (existingGuest) {
            existingGuest.lastUsedAt = new Date();
            await existingGuest.save();
            let user = await this.userModel.findOne({ providerId: existingGuest.token, provider: 'guest' });
            if (!user) {
                user = await this.userModel.create({
                    email: `guest_${existingGuest.token}@guest.local`,
                    provider: 'guest',
                    providerId: existingGuest.token,
                    name: 'Guest User',
                });
            }
            return { token: existingGuest.token, user };
        }
        const guestToken = await this.guestTokenModel.create({
            token,
            ipAddress,
            userAgent,
            isActive: true,
        });
        const user = await this.userModel.create({
            email: `guest_${token}@guest.local`,
            provider: 'guest',
            providerId: token,
            name: 'Guest User',
        });
        this.logger.log(`Created guest token for IP: ${ipAddress}`);
        return { token, user };
    }
    async validateGuestToken(token, ipAddress) {
        const guestToken = await this.guestTokenModel.findOne({
            token,
            ipAddress,
            isActive: true,
        });
        if (!guestToken) {
            return null;
        }
        if (guestToken.expiresAt < new Date()) {
            guestToken.isActive = false;
            await guestToken.save();
            return null;
        }
        guestToken.lastUsedAt = new Date();
        await guestToken.save();
        return this.userModel.findOne({ providerId: token, provider: 'guest' });
    }
    async revokeGuestToken(token) {
        await this.guestTokenModel.updateOne({ token }, { isActive: false });
    }
};
exports.GuestService = GuestService;
exports.GuestService = GuestService = GuestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(guest_token_schema_1.GuestToken.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], GuestService);
//# sourceMappingURL=guest.service.js.map