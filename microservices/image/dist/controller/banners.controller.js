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
var BannersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannersController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const image_banners_service_1 = require("../service/image.banners.service");
const fs = require("fs");
const path = require("path");
let BannersController = BannersController_1 = class BannersController {
    constructor(bannerService) {
        this.bannerService = bannerService;
        this.logger = new common_1.Logger(BannersController_1.name);
    }
    async serveBannerImage(nombre, device, res) {
        if (!device || device === '') {
            device = 'desktop';
        }
        try {
            const filePath = await this.bannerService.getBannerImage(nombre, device);
            if (!fs.existsSync(filePath)) {
                throw new common_1.NotFoundException('La imagen solicitada no existe');
            }
            const ext = path.extname(filePath).toLowerCase();
            let contentType = 'image/webp';
            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    contentType = 'image/jpeg';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.gif':
                    contentType = 'image/gif';
                    break;
                case '.webp':
                    contentType = 'image/webp';
                    break;
            }
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            });
            return res.sendFile(filePath);
        }
        catch (error) {
            this.logger.error(`Error sirviendo imagen: ${error.message}`);
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                return res.status(common_1.HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message,
                    error: 'IMAGEN_NO_ENCONTRADA',
                });
            }
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error al cargar la imagen',
                error: 'ERROR_INTERNO_SERVIDOR',
            });
        }
    }
    async serveBannerImageDefault(nombre, res) {
        return this.serveBannerImage(nombre, 'desktop', res);
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
        return await this.bannerService.getAllBanners(data.fields);
    }
    async getBannerById(data) {
        return await this.bannerService.getBannerById(data.id);
    }
    async deleteBanner(data) {
        this.logger.log(`Deleting banner: ${data.id}`);
        return await this.bannerService.deleteBanner(data.id);
    }
    async toggleBannerStatus(data) {
        try {
            this.logger.log(`Toggling banner status: ${data.id}`);
            return await this.bannerService.toggleBannerStatus(data.id);
        }
        catch (error) {
            this.logger.error(`Error toggling banner status: ${error.message}`);
            return {
                data: null,
                message: error.message,
                success: false,
            };
        }
    }
    getBannerDimensions() {
        try {
            this.logger.log('Getting banner dimensions');
            return {
                data: this.bannerService.getAvailableDimensions(),
                message: 'Dimensiones disponibles obtenidas exitosamente',
                success: true,
            };
        }
        catch (error) {
            this.logger.error(`Error getting banner dimensions: ${error.message}`);
            return {
                data: null,
                message: error.message,
                success: false,
            };
        }
    }
};
exports.BannersController = BannersController;
__decorate([
    (0, common_1.Get)('banner/:nombre/:device'),
    __param(0, (0, common_1.Param)('nombre')),
    __param(1, (0, common_1.Param)('device')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "serveBannerImage", null);
__decorate([
    (0, common_1.Get)('banner/:nombre'),
    __param(0, (0, common_1.Param)('nombre')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "serveBannerImageDefault", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'upload_banner' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "uploadBanner", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_banner_image' }),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerById", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'delete_banner' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "deleteBanner", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'toggle_banner_status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "toggleBannerStatus", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_banner_dimensions' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "getBannerDimensions", null);
exports.BannersController = BannersController = BannersController_1 = __decorate([
    (0, common_1.Controller)('controllerImageApi/image'),
    __metadata("design:paramtypes", [image_banners_service_1.BannerService])
], BannersController);
//# sourceMappingURL=banners.controller.js.map