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
exports.CuponesController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const cupones_service_1 = require("../service/cupones.service");
let CuponesController = class CuponesController {
    constructor(cuponesService) {
        this.cuponesService = cuponesService;
    }
    async crearCupon(payload) {
        const createCuponDto = payload?.createCuponDto || payload;
        return await this.cuponesService.crearCupon(createCuponDto);
    }
    async listarCupones(payload) {
        const { page, limit, filters } = payload;
        return await this.cuponesService.obtenerTodos(page, limit, filters);
    }
    async validarCupon(payload) {
        const { codigo, montoCarrito } = payload;
        return await this.cuponesService.validarCuponBase(codigo, montoCarrito);
    }
    async registrarUsoCupon(payload) {
        const { codigo } = payload;
        return await this.cuponesService.registrarUsoCupon(codigo);
    }
    async desactivarCupon(payload) {
        const { id } = payload;
        return await this.cuponesService.desactivarCupon(id);
    }
};
exports.CuponesController = CuponesController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'crearCupon' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CuponesController.prototype, "crearCupon", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'listarCupones' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CuponesController.prototype, "listarCupones", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'validarCupon' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CuponesController.prototype, "validarCupon", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'registrarUsoCupon' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CuponesController.prototype, "registrarUsoCupon", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'desactivarCupon' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CuponesController.prototype, "desactivarCupon", null);
exports.CuponesController = CuponesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [cupones_service_1.CuponesService])
], CuponesController);
//# sourceMappingURL=cupones.controller.js.map