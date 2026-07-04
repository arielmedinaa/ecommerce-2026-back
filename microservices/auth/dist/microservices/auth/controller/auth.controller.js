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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const auth_service_1 = require("../service/auth.service");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async createGuestSession(payload) {
        const deviceInfo = {
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
        };
        try {
            return await this.authService.createGuestUser(deviceInfo);
        }
        catch (error) {
            this.logger.error('Error in create_guest_session:', error);
            throw error;
        }
    }
    async createBasicUser(payload) {
        try {
            return await this.authService.createBasicUser(payload.email);
        }
        catch (error) {
            this.logger.error('Error in create_basic_user:', error);
            throw error;
        }
    }
    async validateGoogleUser(payload) {
        try {
            const user = await this.authService.validateGoogleUser(payload);
            return await this.authService.login(user);
        }
        catch (error) {
            this.logger.error('Error in validate_google_user:', error);
            throw error;
        }
    }
    async validateBasicUser(payload) {
        try {
            return await this.authService.validateBasicUser(payload.email, payload.deviceInfo);
        }
        catch (error) {
            this.logger.error('Error in validate_basic_user:', error);
            throw error;
        }
    }
    async getUserProfile(payload) {
        try {
            if (!payload.token) {
                return { user: null };
            }
            const decoded = await this.authService.validateToken(payload.token);
            if (!decoded) {
                return { user: null };
            }
            return {
                user: {
                    id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name,
                    provider: decoded.provider,
                },
            };
        }
        catch (error) {
            this.logger.error('Error in get_user_profile:', error);
            throw error;
        }
    }
    async loginUser(payload) {
        try {
            return await this.authService.login(payload);
        }
        catch (error) {
            this.logger.error('Error in login_user:', error);
            throw error;
        }
    }
    async ultimoInicioSesionUsuario(payload) {
        try {
            await this.authService.ultimoInicioSesionUsuario(payload.token, payload.email);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Error in ultimo_inicio_sesion_usuario:', error);
            throw error;
        }
    }
    async obtenerEtiquetasUsuario(payload) {
        try {
            return await this.authService.getUsuarioEtiquetas(payload.usuario_id);
        }
        catch (error) {
            this.logger.error('Error in obtener_etiquetas_usuario:', error);
            throw error;
        }
    }
    async getUserByDocument(payload) {
        try {
            return await this.authService.getUserByDocument(payload.documento);
        }
        catch (error) {
            this.logger.error('Error in getUserByDocument:', error);
            throw error;
        }
    }
    async createUserCoupon(payload) {
        try {
            return await this.authService.createUserCoupon(payload);
        }
        catch (error) {
            this.logger.error('Error in createUserCoupon:', error);
            throw error;
        }
    }
    async createUserCouponBulk(payload) {
        try {
            return await this.authService.asignarCuponMasivo(payload);
        }
        catch (error) {
            this.logger.error('Error in createUserCouponBulk:', error);
            throw error;
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'create_guest_session' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createGuestSession", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'create_basic_user' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createBasicUser", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'validate_google_user' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateGoogleUser", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'validate_basic_user' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateBasicUser", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_user_profile' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserProfile", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'login_user' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginUser", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'ultimo_inicio_sesion_usuario' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "ultimoInicioSesionUsuario", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'obtener_etiquetas_usuario' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "obtenerEtiquetasUsuario", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getUserByDocument' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserByDocument", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'createUserCoupon' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createUserCoupon", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'createUserCouponBulk' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createUserCouponBulk", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map