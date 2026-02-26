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
exports.BannersController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const image_banners_service_1 = require("../../service/image.banners.service");
let BannersController = class BannersController {
    constructor(bannerService) {
        this.bannerService = bannerService;
    }
    async uploadBanner(data) {
        return await this.bannerService.uploadBanner(data.file, data.nombre, data.variante, data.creadoPor, data.modificadoPor);
    }
    async getBannerImage(data) {
        const filePath = await this.bannerService.getBannerImage(data.nombre, data.device || 'desktop');
        return {
            data: { filePath },
            message: 'Imagen de banner obtenida exitosamente',
            success: true,
        };
    }
    async getAllBanners(data) {
        const result = await this.bannerService.getAllBanners(data.fields);
        return result;
    }
    async getBannerById(data) {
        return await this.bannerService.getBannerById(data.id);
    }
    async deleteBanner(data) {
        return await this.bannerService.deleteBanner(data.id);
    }
    async toggleBannerStatus(data) {
        return await this.bannerService.toggleBannerStatus(data.id);
    }
    async getBannerDimensions() {
        return {
            data: this.bannerService.getAvailableDimensions(),
            message: 'Dimensiones disponibles obtenidas exitosamente',
            success: true,
        };
    }
};
exports.BannersController = BannersController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'upload_banner' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "uploadBanner", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_banner_image' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerImage", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_all_banners' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getAllBanners", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_banner_by_id' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerById", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'delete_banner' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "deleteBanner", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'toggle_banner_status' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "toggleBannerStatus", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_banner_dimensions' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerDimensions", null);
exports.BannersController = BannersController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [image_banners_service_1.BannerService])
], BannersController);
//# sourceMappingURL=banners.tcp.controller.js.map