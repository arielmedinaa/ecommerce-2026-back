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
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const landings_error_schema_1 = require("../../schemas/errors/landings.error.schema");
let LandingErrorService = LandingErrorService_1 = class LandingErrorService {
    constructor(landingErrorRepo, landingErrorReadRepo) {
        this.landingErrorRepo = landingErrorRepo;
        this.landingErrorReadRepo = landingErrorReadRepo;
        this.logger = new common_1.Logger(LandingErrorService_1.name);
    }
    async logMicroserviceError(error, landingId, operation, context) {
        try {
            let userId;
            if (context?.userId) {
                userId = typeof context.userId === 'object' && context.userId.toString ? context.userId.toString() : String(context.userId);
            }
            const errorLog = this.landingErrorRepo.create({
                landingId: landingId,
                errorCode: error.name || 'UNKNOWN_ERROR',
                message: error.message || 'Error desconocido',
                context: context || {},
                stackTrace: error.stack,
                path: operation || 'unknown',
                operation: operation || 'unknown',
                requestPayload: context || {},
                userId: userId,
            });
            await this.landingErrorRepo.save(errorLog);
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
            const [errors, total] = await this.landingErrorReadRepo.findAndCount({
                where: query,
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
            });
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
            const error = await this.landingErrorReadRepo.findOne({ where: { id } });
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
            return await this.landingErrorReadRepo.find({
                where: { landingId },
                order: { createdAt: 'DESC' }
            });
        }
        catch (error) {
            this.logger.error('Error al obtener errores por landing ID', error);
            throw error;
        }
    }
    async getErrorStats() {
        try {
            const totalErrors = await this.landingErrorReadRepo.count();
            const errorsByOperation = await this.landingErrorReadRepo
                .createQueryBuilder('err')
                .select('err.operation', '_id')
                .addSelect('COUNT(*)', 'count')
                .groupBy('err.operation')
                .orderBy('count', 'DESC')
                .getRawMany();
            const recentErrors = await this.landingErrorReadRepo.find({
                order: { createdAt: 'DESC' },
                take: 10,
                select: ['errorCode', 'message', 'operation', 'createdAt']
            });
            const errorsByCode = await this.landingErrorReadRepo
                .createQueryBuilder('err')
                .select('err.errorCode', '_id')
                .addSelect('COUNT(*)', 'count')
                .groupBy('err.errorCode')
                .orderBy('count', 'DESC')
                .getRawMany();
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
            const result = await this.landingErrorRepo.delete({
                createdAt: (0, typeorm_2.LessThan)(cutoffDate)
            });
            this.logger.log(`Eliminados ${result.affected || 0} errores antiguos (${daysOld} días)`);
        }
        catch (error) {
            this.logger.error('Error al limpiar errores antiguos', error);
            throw error;
        }
    }
    buildErrorQuery(filters) {
        const query = {};
        if (filters?.landingId) {
            query.landingId = filters.landingId;
        }
        if (filters?.errorCode) {
            query.errorCode = filters.errorCode;
        }
        if (filters?.operation) {
            query.operation = filters.operation;
        }
        if (filters?.userId) {
            query.userId = filters.userId;
        }
        if (filters?.search) {
            return [
                { ...query, message: (0, typeorm_2.Like)(`%${filters.search}%`) },
                { ...query, errorCode: (0, typeorm_2.Like)(`%${filters.search}%`) },
                { ...query, operation: (0, typeorm_2.Like)(`%${filters.search}%`) }
            ];
        }
        return query;
    }
};
exports.LandingErrorService = LandingErrorService;
exports.LandingErrorService = LandingErrorService = LandingErrorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(landings_error_schema_1.LandingError, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(landings_error_schema_1.LandingError, 'READ_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LandingErrorService);
//# sourceMappingURL=landings-error.service.js.map