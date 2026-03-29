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
exports.ConditionsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const conditions_service_1 = require("../service/conditions.service");
let ConditionsController = class ConditionsController {
    constructor(conditionsService) {
        this.conditionsService = conditionsService;
    }
    async createCondition(payload) {
        const { evento_id, tipo, valor, activo } = payload;
        return await this.conditionsService.createCondition(evento_id, tipo, valor, activo);
    }
    async findByEvent(payload) {
        const { evento_id } = payload;
        return await this.conditionsService.findByEvent(evento_id);
    }
    async listConditions(payload) {
        const { page, limit, filters } = payload;
        return await this.conditionsService.findAll(page, limit, filters);
    }
    async deleteCondition(payload) {
        const { id } = payload;
        await this.conditionsService.deleteCondition(id);
        return { message: 'Condición eliminada exitosamente' };
    }
    async toggleCondition(payload) {
        const { id } = payload;
        return await this.conditionsService.toggleCondition(id);
    }
};
exports.ConditionsController = ConditionsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'crearCondicionEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConditionsController.prototype, "createCondition", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'condicionesPorEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConditionsController.prototype, "findByEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'listarCondiciones' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConditionsController.prototype, "listConditions", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'eliminarCondicion' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConditionsController.prototype, "deleteCondition", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'toggleCondicion' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConditionsController.prototype, "toggleCondition", null);
exports.ConditionsController = ConditionsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [conditions_service_1.ConditionsService])
], ConditionsController);
//# sourceMappingURL=conditions.controller.js.map