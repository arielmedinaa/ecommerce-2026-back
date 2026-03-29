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
var ConditionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_condition_schema_1 = require("../../schemas/event-condition.schema");
let ConditionsService = ConditionsService_1 = class ConditionsService {
    constructor(conditionRepository, conditionRepositoryRead) {
        this.conditionRepository = conditionRepository;
        this.conditionRepositoryRead = conditionRepositoryRead;
        this.logger = new common_1.Logger(ConditionsService_1.name);
    }
    async createCondition(evento_id, tipo, valor, activo = true) {
        try {
            const condition = this.conditionRepository.create({
                evento_id,
                tipo,
                valor,
                activo,
            });
            const saved = await this.conditionRepository.save(condition);
            return {
                data: saved,
                message: 'CONDICIÓN CREADA CON EXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al crear condición', error);
            throw new common_1.BadRequestException('Error al crear la condición.');
        }
    }
    async findByEvent(evento_id) {
        return await this.conditionRepositoryRead.find({
            where: { evento_id, activo: true },
        });
    }
    async findAll(page = 1, limit = 10, filters = {}) {
        const skip = Math.max(0, (page - 1) * limit);
        const queryBuilder = this.conditionRepositoryRead.createQueryBuilder('condition');
        if (filters.evento_id) {
            queryBuilder.andWhere('condition.evento_id = :evento_id', {
                evento_id: filters.evento_id,
            });
        }
        if (filters.tipo) {
            queryBuilder.andWhere('condition.tipo = :tipo', { tipo: filters.tipo });
        }
        if (filters.activo !== undefined) {
            queryBuilder.andWhere('condition.activo = :activo', {
                activo: filters.activo,
            });
        }
        const [conditions, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy('condition.createdAt', 'DESC')
            .getManyAndCount();
        return {
            conditions,
            total,
            pages: Math.ceil(total / limit),
        };
    }
    async deleteCondition(id) {
        const result = await this.conditionRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Condición con ID ${id} no encontrada`);
        }
    }
    async toggleCondition(id) {
        const condition = await this.conditionRepositoryRead.findOne({
            where: { id },
        });
        if (!condition) {
            throw new common_1.NotFoundException(`Condición con ID ${id} no encontrada`);
        }
        condition.activo = !condition.activo;
        return await this.conditionRepository.save(condition);
    }
};
exports.ConditionsService = ConditionsService;
exports.ConditionsService = ConditionsService = ConditionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(event_condition_schema_1.EventCondition, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(event_condition_schema_1.EventCondition, 'READ_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ConditionsService);
//# sourceMappingURL=conditions.service.js.map