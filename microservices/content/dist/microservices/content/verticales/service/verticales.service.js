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
var VerticalesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerticalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const verticales_schemas_1 = require("../schemas/verticales.schemas");
const typeorm_2 = require("typeorm");
const vertical_validation_1 = require("./valid/vertical.validation");
let VerticalesService = VerticalesService_1 = class VerticalesService {
    constructor(verticalRepository, verticalRepositoryRead, verticalValidation) {
        this.verticalRepository = verticalRepository;
        this.verticalRepositoryRead = verticalRepositoryRead;
        this.verticalValidation = verticalValidation;
        this.logger = new common_1.Logger(VerticalesService_1.name);
        this.verticalCache = new Map();
        this.cacheTTL = 30 * 1000;
    }
    async create(vertical) {
        const validation = await this.verticalValidation.validateVertical(vertical);
        if (!validation.isValid) {
            this.logger.error('Error de validación al crear vertical', validation.error);
            return {
                data: null,
                message: validation.error,
                success: false,
            };
        }
        try {
            const result = await this.verticalRepository.save(vertical);
            this.invalidateCache();
            return {
                data: result,
                message: 'VERTICAL CREADA CON ÉXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al crear vertical', error);
            return {
                data: null,
                message: 'ERROR AL CREAR VERTICAL',
                success: false,
            };
        }
    }
    async findAll(filters = {}) {
        const validation = await this.verticalValidation.validateFilters(filters);
        if (!validation.isValid) {
            this.logger.error('Error de validación en filtros', validation.error);
            return {
                data: [],
                message: validation.error,
                success: false,
                total: 0,
            };
        }
        const cacheKey = `vertical_cache_${JSON.stringify(filters)}`;
        const now = Date.now();
        const cached = this.verticalCache.get(cacheKey);
        if (cached && now - cached.timestamp < this.cacheTTL) {
            return {
                data: cached.data,
                message: 'VERTICALES OBTENIDAS DESDE CACHE',
                success: true,
                total: cached.data.length,
            };
        }
        try {
            const result = await this.verticalRepositoryRead.find(filters);
            if (!result || result.length === 0) {
                return {
                    data: [],
                    message: 'NO SE ENCONTRARON VERTICALES',
                    success: false,
                    total: 0,
                };
            }
            this.verticalCache.set(cacheKey, {
                data: result,
                timestamp: now,
            });
            return {
                data: result,
                message: 'VERTICALES OBTENIDAS CON ÉXITO',
                success: true,
                total: result.length,
            };
        }
        catch (error) {
            this.logger.error('Error al obtener verticales', error);
            return {
                data: [],
                message: 'ERROR AL OBTENER VERTICALES',
                success: false,
                total: 0,
            };
        }
    }
    async findOne(id) {
        try {
            const result = await this.verticalRepositoryRead.findOne({
                where: { id },
            });
            if (!result) {
                return {
                    data: null,
                    message: 'VERTICAL NO ENCONTRADA',
                    success: false,
                };
            }
            return {
                data: result,
                message: 'VERTICAL OBTENIDA CON ÉXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al obtener vertical', error);
            return {
                data: null,
                message: 'ERROR AL OBTENER VERTICAL',
                success: false,
            };
        }
    }
    async update(id, verticalData) {
        const verticalValidation = await this.verticalValidation.validateVertical(verticalData);
        if (!verticalValidation.isValid) {
            return {
                data: null,
                message: verticalValidation.error,
                success: false,
            };
        }
        try {
            const result = await this.verticalRepository.update(id, verticalData);
            if (result.affected === 0) {
                return {
                    data: null,
                    message: 'VERTICAL NO ENCONTRADA PARA ACTUALIZAR',
                    success: false,
                };
            }
            this.invalidateCache();
            const updatedVertical = await this.verticalRepositoryRead.findOne({
                where: { id },
            });
            return {
                data: updatedVertical,
                message: 'VERTICAL ACTUALIZADA CON ÉXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al actualizar vertical', error);
            return {
                data: null,
                message: 'ERROR AL ACTUALIZAR VERTICAL',
                success: false,
            };
        }
    }
    async remove(id) {
        try {
            const result = await this.verticalRepository.delete(id);
            if (result.affected === 0) {
                return {
                    message: 'VERTICAL NO ENCONTRADA PARA ELIMINAR',
                    success: false,
                };
            }
            this.invalidateCache();
            return {
                message: 'VERTICAL ELIMINADA CON ÉXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al eliminar vertical', error);
            return {
                message: 'ERROR AL ELIMINAR VERTICAL',
                success: false,
            };
        }
    }
    invalidateCache() {
        this.verticalCache.clear();
    }
};
exports.VerticalesService = VerticalesService;
exports.VerticalesService = VerticalesService = VerticalesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(verticales_schemas_1.Vertical, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(verticales_schemas_1.Vertical, 'READ_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        vertical_validation_1.VerticalValidation])
], VerticalesService);
//# sourceMappingURL=verticales.service.js.map