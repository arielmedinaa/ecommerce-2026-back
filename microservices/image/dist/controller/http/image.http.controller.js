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
var ImageHttpController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageHttpController = void 0;
const common_1 = require("@nestjs/common");
const image_banners_service_1 = require("../../service/image.banners.service");
const fs = require("fs");
const path = require("path");
let ImageHttpController = ImageHttpController_1 = class ImageHttpController {
    constructor(bannerService) {
        this.bannerService = bannerService;
        this.logger = new common_1.Logger(ImageHttpController_1.name);
    }
    async getAllBanners(body) {
        try {
            const result = await this.bannerService.getAllBanners(body.fields);
            return result;
        }
        catch (error) {
            return {
                data: [],
                message: `Error al obtener banners: ${error.message}`,
                success: false,
            };
        }
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
};
exports.ImageHttpController = ImageHttpController;
__decorate([
    (0, common_1.Post)('banner/list'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImageHttpController.prototype, "getAllBanners", null);
__decorate([
    (0, common_1.Get)('banner/:nombre/:device'),
    __param(0, (0, common_1.Param)('nombre')),
    __param(1, (0, common_1.Param)('device')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ImageHttpController.prototype, "serveBannerImage", null);
__decorate([
    (0, common_1.Get)('banner/:nombre'),
    __param(0, (0, common_1.Param)('nombre')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImageHttpController.prototype, "serveBannerImageDefault", null);
exports.ImageHttpController = ImageHttpController = ImageHttpController_1 = __decorate([
    (0, common_1.Controller)('controllerImageApi/image'),
    __metadata("design:paramtypes", [image_banners_service_1.BannerService])
], ImageHttpController);
//# sourceMappingURL=image.http.controller.js.map