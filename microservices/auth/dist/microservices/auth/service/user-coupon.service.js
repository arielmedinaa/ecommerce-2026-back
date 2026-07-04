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
var UserCouponService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCouponService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_coupon_schema_1 = require("../schemas/user-coupon.schema");
let UserCouponService = UserCouponService_1 = class UserCouponService {
    constructor(userCouponRepository) {
        this.userCouponRepository = userCouponRepository;
        this.logger = new common_1.Logger(UserCouponService_1.name);
    }
    async getUserCoupons(userId) {
        try {
            return await this.userCouponRepository.find({
                where: {
                    userId: { id: userId },
                    isActive: true
                },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            this.logger.error('Error al obtener cupones del usuario', error);
            return [];
        }
    }
    async getActiveUserCoupons(userId) {
        try {
            return await this.userCouponRepository.find({
                where: {
                    userId: { id: userId },
                    isActive: true,
                },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            this.logger.error('Error al obtener cupones activos del usuario', error);
            return [];
        }
    }
    async getUserCouponsCount(userId, idCupon) {
        try {
            return await this.userCouponRepository
                .createQueryBuilder('uc')
                .where('uc.userId = :uid', { uid: Number(userId) })
                .andWhere('uc.idCupon = :idCupon', { idCupon: Number(idCupon) })
                .andWhere('uc.isActive = :active', { active: true })
                .getCount();
        }
        catch (error) {
            this.logger.error('Error al obtener cantidad de cupones del usuario', error);
            return 0;
        }
    }
    async createUserCoupon(couponData) {
        try {
            const newCoupon = this.userCouponRepository.create(couponData);
            return await this.userCouponRepository.save(newCoupon);
        }
        catch (error) {
            this.logger.error('Error al crear cupón de usuario', error);
            throw error;
        }
    }
    async validateCoupon(userId, couponCode) {
        try {
            const coupon = await this.userCouponRepository.findOne({
                where: {
                    userId: { id: userId },
                    idCupon: parseInt(couponCode),
                    isActive: true,
                },
            });
            if (!coupon) {
                return { valid: false, message: 'Cupón no encontrado o no válido' };
            }
            return { valid: true, coupon, message: 'Cupón válido' };
        }
        catch (error) {
            this.logger.error('Error al validar cupón', error);
            return { valid: false, message: 'Error al validar cupón' };
        }
    }
    async getCouponsForToken(userId) {
        try {
            const activeCoupons = await this.getActiveUserCoupons(userId);
            return activeCoupons.map(coupon => coupon.idCupon.toString());
        }
        catch (error) {
            this.logger.error('Error al obtener cupones para token', error);
            return [];
        }
    }
    async createCouponForUser(userId, couponData) {
        try {
            const user = { id: userId };
            const newCoupon = this.userCouponRepository.create({
                userId: user,
                idCupon: couponData.idCupon,
                descripcion: couponData.descripcion,
                eventId: couponData.eventId,
                isActive: true,
            });
            return await this.userCouponRepository.save(newCoupon);
        }
        catch (error) {
            if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
                this.logger.warn(`Cupón ${couponData.idCupon} ya asignado al usuario ${userId} (duplicado bloqueado)`);
                return null;
            }
            this.logger.error('Error al crear cupón para usuario', error);
            throw error;
        }
    }
};
exports.UserCouponService = UserCouponService;
exports.UserCouponService = UserCouponService = UserCouponService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_coupon_schema_1.UserCoupon)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], UserCouponService);
//# sourceMappingURL=user-coupon.service.js.map