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
var LandingErrorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingErrorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const landings_error_schema_1 = require("../../schemas/errors/landings.error.schema");
let LandingErrorService = LandingErrorService_1 = class LandingErrorService {
    constructor(landingErrorModel) {
        this.landingErrorModel = landingErrorModel;
        this.logger = new common_1.Logger(LandingErrorService_1.name);
    }
    async logMicroserviceError(error, landingId, operation, context) {
        try {
            let landingObjectId;
            if (landingId) {
                try {
                    landingObjectId = new mongoose_2.Types.ObjectId(landingId);
                }
                catch (e) {
                    this.logger.warn(`landingId inválido: ${landingId}`);
                }
            }
            let userObjectId;
            if (context?.userId) {
                try {
                    if (typeof context.userId === 'object' && context.userId._bsontype === 'ObjectId') {
                        userObjectId = context.userId;
                    }
                    else {
                        userObjectId = new mongoose_2.Types.ObjectId(context.userId);
                    }
                }
                catch (e) {
                    this.logger.warn(`userId inválido: ${context.userId}`);
                }
            }
            const errorLog = new this.landingErrorModel({
                landingId: landingObjectId,
                errorCode: error.name || 'UNKNOWN_ERROR',
                message: error.message || 'Error desconocido',
                context: context || {},
                stackTrace: error.stack,
                path: operation || 'unknown',
                operation: operation || 'unknown',
                requestPayload: context || {},
                userId: userObjectId,
            });
            await errorLog.save();
            this.logger.error(`Error en ${operation}: ${error.message}`, error.stack);
        }
        catch (logError) {
            this.logger.error('Error al registrar el error del log', logError);
        }
    }
    async getErrorLogs(page = 1, limit = 10, filters) {
        try {
            const skip = (page - 1) * limit;
            const query = this.buildErrorQuery(filters);
            const [errors, total] = await Promise.all([
                this.landingErrorModel
                    .find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.landingErrorModel.countDocuments(query)
            ]);
            return {
                errors,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            };
        }
        catch (error) {
            this.logger.error('Error al obtener logs de errores', error);
            throw error;
        }
    }
    async getErrorById(id) {
        try {
            const error = await this.landingErrorModel.findById(id).exec();
            if (!error) {
                throw new Error('Error log no encontrado');
            }
            return error;
        }
        catch (error) {
            this.logger.error('Error al obtener error por ID', error);
            throw error;
        }
    }
    async getErrorsByLandingId(landingId) {
        try {
            let landingObjectId;
            try {
                landingObjectId = new mongoose_2.Types.ObjectId(landingId);
            }
            catch (e) {
                throw new Error(`landingId inválido: ${landingId}`);
            }
            return await this.landingErrorModel
                .find({ landingId: landingObjectId })
                .sort({ createdAt: -1 })
                .exec();
        }
        catch (error) {
            this.logger.error('Error al obtener errores por landing ID', error);
            throw error;
        }
    }
    async getErrorStats() {
        try {
            const [totalErrors, errorsByOperation, recentErrors, errorsByCode] = await Promise.all([
                this.landingErrorModel.countDocuments(),
                this.landingErrorModel.aggregate([
                    { $group: { _id: '$operation', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                this.landingErrorModel
                    .find()
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .select('errorCode message operation createdAt')
                    .exec(),
                this.landingErrorModel.aggregate([
                    { $group: { _id: '$errorCode', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ])
            ]);
            return {
                totalErrors,
                errorsByOperation,
                recentErrors,
                errorsByCode
            };
        }
        catch (error) {
            this.logger.error('Error al obtener estadísticas de errores', error);
            throw error;
        }
    }
    async clearOldErrors(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const result = await this.landingErrorModel.deleteMany({
                createdAt: { $lt: cutoffDate }
            });
            this.logger.log(`Eliminados ${result.deletedCount} errores antiguos (${daysOld} días)`);
        }
        catch (error) {
            this.logger.error('Error al limpiar errores antiguos', error);
            throw error;
        }
    }
    buildErrorQuery(filters) {
        const query = {};
        if (filters?.landingId) {
            try {
                query.landingId = new mongoose_2.Types.ObjectId(filters.landingId);
            }
            catch (e) {
                this.logger.warn(`landingId inválido en filtros: ${filters.landingId}`);
            }
        }
        if (filters?.errorCode) {
            query.errorCode = filters.errorCode;
        }
        if (filters?.operation) {
            query.operation = filters.operation;
        }
        if (filters?.userId) {
            try {
                query.userId = new mongoose_2.Types.ObjectId(filters.userId);
            }
            catch (e) {
                this.logger.warn(`userId inválido en filtros: ${filters.userId}`);
            }
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters?.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters?.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }
        if (filters?.search) {
            query.$or = [
                { message: { $regex: filters.search, $options: 'i' } },
                { errorCode: { $regex: filters.search, $options: 'i' } },
                { operation: { $regex: filters.search, $options: 'i' } }
            ];
        }
        return query;
    }
};
exports.LandingErrorService = LandingErrorService;
exports.LandingErrorService = LandingErrorService = LandingErrorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(landings_error_schema_1.LandingError.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], LandingErrorService);
//# sourceMappingURL=landings-error.service.js.map