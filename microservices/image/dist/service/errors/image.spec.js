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
var BannerValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerValidationService = void 0;
const common_1 = require("@nestjs/common");
const banner_error_service_1 = require("./banner-error.service");
let BannerValidationService = BannerValidationService_1 = class BannerValidationService {
    constructor(bannerErrorService) {
        this.bannerErrorService = bannerErrorService;
        this.logger = new common_1.Logger(BannerValidationService_1.name);
    }
    async validateBannerUpload(file, nombre, variante, creadoPor, modificadoPor, bannerId) {
        if (!file) {
            const error = new Error('No se proporcionó ninguna imagen');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'archivo_no_proporcionado', { file: null, nombre, variante }, creadoPor);
            this.logger.error('Error al validar el archivo', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'No se proporcionó ninguna imagen',
                    data: [],
                },
            };
        }
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(file.mimetype)) {
            const error = new Error('Tipo de archivo no válido');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'tipo_archivo_invalido', { mimetype: file.mimetype, allowedMimes, nombre }, creadoPor);
            this.logger.error('Error al validar el tipo de archivo', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Solo se permiten archivos de imagen (jpeg, png, webp, gif)',
                    data: [],
                },
            };
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            const error = new Error('Archivo demasiado grande');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'archivo_demasiado_grande', { size: file.size, maxSize, nombre }, creadoPor);
            this.logger.error('Error al validar el tamaño del archivo', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'El archivo no puede ser mayor a 10MB',
                    data: [],
                },
            };
        }
        if (!nombre || nombre.trim() === '') {
            const error = new Error('Nombre del banner es requerido');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'nombre_requerido', { nombre, variante }, creadoPor);
            this.logger.error('Error al validar el nombre del banner', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'El nombre del banner es requerido',
                    data: [],
                },
            };
        }
        if (!variante || variante.trim() === '') {
            const error = new Error('Variante del banner es requerida');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'variante_requerida', { nombre, variante }, creadoPor);
            this.logger.error('Error al validar la variante del banner', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'La variante del banner es requerida',
                    data: [],
                },
            };
        }
        if (!creadoPor || creadoPor.trim() === '') {
            const error = new Error('Usuario creador es requerido');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'creadoPor_requerido', { nombre, variante, creadoPor }, creadoPor);
            this.logger.error('Error al validar el usuario creador', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'El usuario creador es requerido',
                    data: [],
                },
            };
        }
        if (!modificadoPor || modificadoPor.trim() === '') {
            const error = new Error('Usuario modificador es requerido');
            await this.bannerErrorService.logValidationError(bannerId || 'unknown', 'validateBannerUpload', 'modificadoPor_requerido', { nombre, variante, modificadoPor }, creadoPor);
            this.logger.error('Error al validar el usuario modificador', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'El usuario modificador es requerido',
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
    async validateBannerId(id, operation = 'validateBannerId') {
        if (!id || id.trim() === '') {
            const error = new Error('ID de banner inválido');
            await this.bannerErrorService.logValidationError('unknown', operation, 'id_invalido', { id });
            this.logger.error('Error al validar el ID del banner', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'ID de banner inválido',
                    data: [],
                },
            };
        }
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(id)) {
            const error = new Error('ID de banner no tiene formato válido');
            await this.bannerErrorService.logValidationError(id, operation, 'id_formato_invalido', { id });
            this.logger.error('Error al validar el formato del ID', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'ID de banner no tiene formato válido',
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
    async validateBannerUpdate(id, updateData, operation = 'validateBannerUpdate', userId) {
        const idValidation = await this.validateBannerId(id, operation);
        if (!idValidation.isValid) {
            return idValidation;
        }
        if (!updateData || Object.keys(updateData).length === 0) {
            const error = new Error('No se proporcionaron datos para actualizar');
            await this.bannerErrorService.logValidationError(id, operation, 'datos_vacios', { updateData }, userId);
            this.logger.error('Error al validar datos de actualización', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'No se proporcionaron datos para actualizar',
                    data: [],
                },
            };
        }
        if (updateData.nombre !== undefined) {
            if (!updateData.nombre || updateData.nombre.trim() === '') {
                const error = new Error('El nombre no puede estar vacío');
                await this.bannerErrorService.logValidationError(id, operation, 'nombre_vacio', { updateData }, userId);
                this.logger.error('Error al validar el nombre en actualización', error);
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'El nombre no puede estar vacío',
                        data: [],
                    },
                };
            }
        }
        if (updateData.variante !== undefined) {
            if (!updateData.variante || updateData.variante.trim() === '') {
                const error = new Error('La variante no puede estar vacía');
                await this.bannerErrorService.logValidationError(id, operation, 'variante_vacia', { updateData }, userId);
                this.logger.error('Error al validar la variante en actualización', error);
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'La variante no puede estar vacía',
                        data: [],
                    },
                };
            }
        }
        return { isValid: true };
    }
    async validateDevice(device, operation = 'validateDevice') {
        const validDevices = ['desktop', 'tablet', 'mobile', 'small'];
        if (!device || !validDevices.includes(device)) {
            const error = new Error('Dispositivo no válido');
            await this.bannerErrorService.logValidationError('unknown', operation, 'dispositivo_invalido', { device, validDevices });
            this.logger.error('Error al validar el dispositivo', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: `Dispositivo no válido. Opciones: ${validDevices.join(', ')}`,
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
};
exports.BannerValidationService = BannerValidationService;
exports.BannerValidationService = BannerValidationService = BannerValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [banner_error_service_1.BannerErrorService])
], BannerValidationService);
//# sourceMappingURL=image.spec.js.map