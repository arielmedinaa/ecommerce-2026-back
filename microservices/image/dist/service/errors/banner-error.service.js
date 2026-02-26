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
exports.BannerErrorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const moment_timezone_1 = require("moment-timezone");
let BannerErrorService = class BannerErrorService {
    constructor(bannerErrorModel) {
        this.bannerErrorModel = bannerErrorModel;
    }
    async logError(bannerId, errorCode, message, context, stackTrace, path, operation, userId, fileName, device) {
        try {
            const errorLog = new this.bannerErrorModel({
                bannerId,
                errorCode,
                message,
                context: {
                    ...context,
                    timestamp: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                    service: 'image-microservice',
                },
                stackTrace,
                path,
                operation,
                userId,
                fileName,
                device,
            });
            return await errorLog.save();
        }
        catch (logError) {
            console.error('Error al guardar log de error de banner:', logError);
            return null;
        }
    }
    async logMicroserviceError(error, bannerId, operation, additionalContext, userId, fileName, device) {
        const errorCode = error.name || 'UNKNOWN_ERROR';
        const message = error.message || 'Error desconocido';
        return this.logError(bannerId || 'unknown', errorCode, message, {
            operation,
            ...additionalContext,
            originalError: {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status,
            },
        }, error.stack, error.path || operation, operation, userId, fileName, device);
    }
    async logValidationError(bannerId, operation, motivo, additionalData, userId) {
        return this.logError(bannerId, 'VALIDATION_ERROR', `Error de validación: ${motivo}`, {
            motivo,
            ...additionalData,
        }, undefined, operation, operation, userId);
    }
    async logFileProcessingError(bannerId, fileName, device, error, operation = 'process_image', userId) {
        return this.logError(bannerId, 'FILE_PROCESSING_ERROR', `Error procesando archivo ${fileName} para dispositivo ${device}`, {
            fileName,
            device,
            originalError: {
                name: error.name,
                message: error.message,
                code: error.code,
            },
        }, error.stack, operation, operation, userId, fileName, device);
    }
    async getErrorLogs(bannerId, limit = 100) {
        const filter = bannerId ? { bannerId } : {};
        return this.bannerErrorModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getErrorStats() {
        const stats = await this.bannerErrorModel.aggregate([
            {
                $group: {
                    _id: '$errorCode',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$createdAt' },
                },
            },
            { $sort: { count: -1 } },
        ]);
        return stats;
    }
    async getErrorsByOperation(operation, limit = 50) {
        return this.bannerErrorModel
            .find({ operation })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getErrorsByDevice(device, limit = 50) {
        return this.bannerErrorModel
            .find({ device })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async clearOldLogs(daysOld = 30) {
        const cutoffDate = (0, moment_timezone_1.default)().tz('America/Asuncion').subtract(daysOld, 'days').toDate();
        const result = await this.bannerErrorModel.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        return { deletedCount: result.deletedCount || 0 };
    }
};
exports.BannerErrorService = BannerErrorService;
exports.BannerErrorService = BannerErrorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('BannerError')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BannerErrorService);
//# sourceMappingURL=banner-error.service.js.map