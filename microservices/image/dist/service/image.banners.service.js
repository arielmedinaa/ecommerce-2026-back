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
var BannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const image_spec_1 = require("./errors/image.spec");
const banner_error_service_1 = require("./errors/banner-error.service");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
const sharp_1 = require("sharp");
let BannerService = BannerService_1 = class BannerService {
    constructor(bannerModel, bannerValidationService, bannerErrorService) {
        this.bannerModel = bannerModel;
        this.bannerValidationService = bannerValidationService;
        this.bannerErrorService = bannerErrorService;
        this.logger = new common_1.Logger(BannerService_1.name);
        this.dimensions = {
            desktop: { width: 1440, height: 400 },
            tablet: { width: 768, height: 300 },
            mobile: { width: 375, height: 200 },
            small: { width: 320, height: 150 },
        };
        this.bannersDir =
            process.env.DIR_IMAGE ||
                '~/Documents/projects/newEcommerce2026/imagesEcommerce/banners';
        this.bannersDir = this.bannersDir.replace('~', require('os').homedir());
        this.ensureDirectoryExists();
    }
    ensureDirectoryExists() {
        if (!fs.existsSync(this.bannersDir)) {
            fs.mkdirSync(this.bannersDir, { recursive: true });
        }
    }
    async uploadBanner(file, nombre, variante, creadoPor, modificadoPor) {
        try {
            const validation = await this.bannerValidationService.validateBannerUpload(file, nombre, variante, creadoPor, modificadoPor);
            if (!validation.isValid) {
                return validation.error;
            }
            const existingBanner = await this.bannerModel.findOne({ nombre });
            if (existingBanner) {
                const error = new Error('Ya existe un banner con ese nombre');
                await this.bannerErrorService.logValidationError(existingBanner._id.toString(), 'uploadBanner', 'nombre_duplicado', { nombre, variante }, creadoPor);
                return {
                    data: null,
                    message: 'Ya existe un banner con ese nombre',
                    success: false,
                };
            }
            const bannerId = (0, uuid_1.v4)();
            const baseFileName = `${bannerId}_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const savedImages = await this.processAndSaveImages(file, baseFileName, bannerId, nombre, creadoPor);
            const bannerData = {
                nombre,
                imagen: savedImages.desktop.fileName,
                variante,
                formato: 'webp',
                ruta: savedImages.desktop.filePath,
                estado: 'activo',
                creadoPor,
                modificadoPor,
                dimensiones: savedImages,
            };
            const newBanner = await this.bannerModel.create(bannerData);
            return {
                data: newBanner,
                message: 'Banner subido exitosamente en todas las dimensiones',
                success: true,
            };
        }
        catch (error) {
            await this.bannerErrorService.logMicroserviceError(error, 'unknown', 'uploadBanner', { nombre, variante, creadoPor, modificadoPor }, creadoPor);
            return {
                data: null,
                message: `Error al subir el banner: ${error}`,
                success: false,
            };
        }
    }
    async processAndSaveImages(file, baseFileName, bannerId, nombre, creadoPor) {
        const savedImages = {};
        const tempPath = file.path;
        try {
            for (const [device, dimension] of Object.entries(this.dimensions)) {
                const fileName = `${baseFileName}_${device}.webp`;
                const filePath = path.join(this.bannersDir, fileName);
                try {
                    await (0, sharp_1.default)(tempPath)
                        .resize(dimension.width, dimension.height, {
                        fit: 'cover',
                        position: 'center',
                    })
                        .webp({ quality: 85 })
                        .toFile(filePath);
                    savedImages[device] = {
                        fileName,
                        filePath,
                        width: dimension.width,
                        height: dimension.height,
                        url: `/image/banner/${baseFileName.split('_')[1]}/${device}`,
                    };
                }
                catch (processError) {
                    await this.bannerErrorService.logFileProcessingError(bannerId, fileName, device, processError, 'processAndSaveImages', creadoPor);
                    throw processError;
                }
            }
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            return savedImages;
        }
        catch (error) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }
    }
    async getBannerImage(nombre, device = 'desktop') {
        try {
            const deviceValidation = await this.bannerValidationService.validateDevice(device, 'getBannerImage');
            if (!deviceValidation.isValid) {
                throw new common_1.BadRequestException(deviceValidation.error.message);
            }
            this.logger.log(`Buscando banner con nombre: "${nombre}" y device: "${device}"`);
            const banner = await this.bannerModel.findOne({
                nombre,
                estado: 'activo',
            });
            this.logger.log(`Banner encontrado: ${banner ? 'SÍ' : 'NO'}`);
            if (banner) {
                this.logger.log(`ID del banner: ${banner._id}, nombre guardado: "${banner.nombre}"`);
            }
            if (!banner) {
                const error = new common_1.NotFoundException('Banner no encontrado');
                await this.bannerErrorService.logValidationError('unknown', 'getBannerImage', 'banner_no_encontrado', { nombre, device });
                throw error;
            }
            const files = fs.readdirSync(this.bannersDir);
            const matchingFile = files.find((file) => file.includes(nombre.replace(/[^a-zA-Z0-9]/g, '_')) &&
                file.includes(`${device}.webp`));
            if (!matchingFile) {
                this.logger.log(`No se encontró archivo para "${nombre}" con device "${device}"`);
                const error = new common_1.NotFoundException('Imagen del banner no encontrada');
                await this.bannerErrorService.logValidationError(banner._id.toString(), 'getBannerImage', 'imagen_no_encontrada', { nombre, device, availableFiles: files });
                throw error;
            }
            const filePath = path.join(this.bannersDir, matchingFile);
            this.logger.log(`Archivo encontrado: ${matchingFile}`);
            this.logger.log(`Ruta completa: ${filePath}`);
            return filePath;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            await this.bannerErrorService.logMicroserviceError(error, 'unknown', 'getBannerImage', { nombre, device });
            throw new common_1.BadRequestException(`Error al obtener la imagen del banner: ${error}`);
        }
    }
    async getAllBanners(fields) {
        try {
            const banners = await this.bannerModel.find({}, fields).sort({ createdAt: -1 });
            return {
                data: banners,
                message: 'Banners obtenidos exitosamente',
                success: true,
            };
        }
        catch (error) {
            await this.bannerErrorService.logMicroserviceError(error, 'unknown', 'getAllBanners');
            return {
                data: null,
                message: `Error al obtener los banners: ${error}`,
                success: false,
            };
        }
    }
    async getBannerById(id) {
        try {
            const idValidation = await this.bannerValidationService.validateBannerId(id, 'getBannerById');
            if (!idValidation.isValid) {
                return idValidation.error;
            }
            const banner = await this.bannerModel.findById(id);
            if (!banner) {
                new common_1.NotFoundException('Banner no encontrado');
                await this.bannerErrorService.logValidationError(id, 'getBannerById', 'banner_no_encontrado', { id });
                return {
                    data: null,
                    message: 'Banner no encontrado',
                    success: false,
                };
            }
            return {
                data: banner,
                message: 'Banner encontrado exitosamente',
                success: true,
            };
        }
        catch (error) {
            await this.bannerErrorService.logMicroserviceError(error, id, 'getBannerById');
            return {
                data: null,
                message: `Error al obtener el banner: ${error}`,
                success: false,
            };
        }
    }
    async deleteBanner(id) {
        try {
            const idValidation = await this.bannerValidationService.validateBannerId(id, 'deleteBanner');
            if (!idValidation.isValid) {
                return idValidation.error;
            }
            const banner = await this.bannerModel.findById(id);
            if (!banner) {
                const error = new common_1.NotFoundException('Banner no encontrado');
                await this.bannerErrorService.logValidationError(id, 'deleteBanner', 'banner_no_encontrado', { id });
                return {
                    data: null,
                    message: 'Banner no encontrado',
                    success: false,
                };
            }
            const baseFileName = `${banner._id}_${banner.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
            for (const device of Object.keys(this.dimensions)) {
                const fileName = `${baseFileName}_${device}.webp`;
                const filePath = path.join(this.bannersDir, fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    }
                    catch (deleteError) {
                        await this.bannerErrorService.logFileProcessingError(id, fileName, device, deleteError, 'deleteBanner');
                    }
                }
            }
            await this.bannerModel.findByIdAndDelete(id);
            return {
                data: null,
                message: 'Banner eliminado exitosamente',
                success: true,
            };
        }
        catch (error) {
            await this.bannerErrorService.logMicroserviceError(error, id, 'deleteBanner');
            return {
                data: null,
                message: `Error al eliminar el banner: ${error}`,
                success: false,
            };
        }
    }
    async toggleBannerStatus(id) {
        try {
            const idValidation = await this.bannerValidationService.validateBannerId(id, 'toggleBannerStatus');
            if (!idValidation.isValid) {
                return idValidation.error;
            }
            const banner = await this.bannerModel.findById(id);
            if (!banner) {
                const error = new common_1.NotFoundException('Banner no encontrado');
                await this.bannerErrorService.logValidationError(id, 'toggleBannerStatus', 'banner_no_encontrado', { id });
                return {
                    data: null,
                    message: 'Banner no encontrado',
                    success: false,
                };
            }
            const newStatus = banner.estado === 'activo' ? 'inactivo' : 'activo';
            const updatedBanner = await this.bannerModel.findByIdAndUpdate(id, {
                estado: newStatus,
                updatedAt: new Date(),
            }, { new: true });
            if (!updatedBanner) {
                const error = new Error('No se pudo actualizar el estado del banner');
                await this.bannerErrorService.logValidationError(id, 'toggleBannerStatus', 'error_cambio_estado', { currentStatus: banner.estado, newStatus });
                return {
                    data: null,
                    message: 'No se pudo actualizar el estado del banner',
                    success: false,
                };
            }
            return {
                data: updatedBanner,
                message: `Banner ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
                success: true,
            };
        }
        catch (error) {
            await this.bannerErrorService.logMicroserviceError(error, id, 'toggleBannerStatus');
            return {
                data: null,
                message: `Error al cambiar el estado del banner: ${error}`,
                success: false,
            };
        }
    }
    getAvailableDimensions() {
        return this.dimensions;
    }
};
exports.BannerService = BannerService;
exports.BannerService = BannerService = BannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Banners')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        image_spec_1.BannerValidationService,
        banner_error_service_1.BannerErrorService])
], BannerService);
//# sourceMappingURL=image.banners.service.js.map