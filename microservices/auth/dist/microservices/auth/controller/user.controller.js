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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const user_service_1 = require("../service/user.service");
const user_coupon_service_1 = require("../service/user-coupon.service");
const erp_cliente_service_1 = require("../service/erp-cliente.service");
const user_track_service_1 = require("../service/user-track.service");
let UserController = class UserController {
    constructor(userService, userCouponService, erpClienteService, userTrackService) {
        this.userService = userService;
        this.userCouponService = userCouponService;
        this.erpClienteService = erpClienteService;
        this.userTrackService = userTrackService;
    }
    async getClienteErp(payload) {
        return this.erpClienteService.getClienteErpByDocumento(String(payload?.documento ?? ''));
    }
    async getCargosRubros() {
        return this.erpClienteService.getCatalogos();
    }
    async getAllUsers(data) {
        return this.userService.getAllUsers(data.filters);
    }
    async searchUsers(data) {
        return this.userService.searchUsers(data.filters);
    }
    async listClientes(params) {
        return this.userService.listClientes(params || {});
    }
    async getClientesStats() {
        return this.userService.getClientesStats();
    }
    async listClienteIds(params) {
        return this.userService.listClienteIds(params || {});
    }
    async getUserCoupons(payload) {
        const cupones = await this.userCouponService.getUserCoupons(Number(payload?.userId));
        return { data: cupones, success: true, message: 'CUPONES DEL USUARIO' };
    }
    async sendMassMessage(payload) {
        return this.userService.enviarMensajeMasivo(payload);
    }
    async findUserByEmail(payload) {
        return this.userService.findUserByEmail(payload?.email, payload?.excludeUserId);
    }
    async sendEmailCode(payload) {
        return this.userService.sendEmailCode(payload?.email);
    }
    async verifyEmailCode(payload) {
        return this.userService.verifyEmailCode(payload?.email, payload?.code);
    }
    async updateUsers(data) {
        return this.userService.updateUsers(data.filters, data.updates);
    }
    async getProfile(payload) {
        return this.userService.getProfile(Number(payload?.userId));
    }
    async updateUserPersonal(payload) {
        return this.userService.updateProfile(Number(payload?.userId), payload?.patch || {});
    }
    async getUserAddresses(payload) {
        return this.userService.getUserAddresses(Number(payload?.userId));
    }
    async addUserAddress(payload) {
        return this.userService.addUserAddress(Number(payload?.userId), payload?.address);
    }
    async updateUserAddress(payload) {
        return this.userService.updateUserAddress(Number(payload?.userId), payload?.addressId, payload?.patch);
    }
    async deleteUserAddress(payload) {
        return this.userService.deleteUserAddress(Number(payload?.userId), payload?.addressId);
    }
    handleTrackEvent(payload) {
        this.userTrackService.track(payload);
    }
    async getUserTrack(payload) {
        return this.userTrackService.getUserTrack(String(payload?.userId ?? ''));
    }
};
exports.UserController = UserController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_cliente_erp' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getClienteErp", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_cargos_rubros' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getCargosRubros", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_all_users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAllUsers", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'search_users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "searchUsers", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'list_clientes' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "listClientes", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_clientes_stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getClientesStats", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'list_cliente_ids' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "listClienteIds", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_user_coupons' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserCoupons", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'send_mass_message' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "sendMassMessage", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'find_user_by_email' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findUserByEmail", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'send_email_code' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "sendEmailCode", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'verify_email_code' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "verifyEmailCode", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'update_users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUsers", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_user_profile_db' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'update_user_personal' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserPersonal", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_user_addresses' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserAddresses", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'add_user_address' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "addUserAddress", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'update_user_address' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserAddress", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'delete_user_address' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUserAddress", null);
__decorate([
    (0, microservices_1.EventPattern)('track_user_event'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "handleTrackEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_user_track' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserTrack", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        user_coupon_service_1.UserCouponService,
        erp_cliente_service_1.ErpClienteService,
        user_track_service_1.UserTrackService])
], UserController);
//# sourceMappingURL=user.controller.js.map