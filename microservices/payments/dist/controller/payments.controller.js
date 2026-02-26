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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("../service/payments.service");
const microservices_1 = require("@nestjs/microservices");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async registrarPago(payload) {
        return await this.paymentsService.registrarPago(payload.codigoCarrito, payload.carrito, payload.metodoPago, payload.monto, payload.moneda, payload.cliente, payload.descripcion, payload.respuestaPagopar, payload.respuestaBancard);
    }
    async listarPagosPorCarrito(payload) {
        return await this.paymentsService.listarPagosPorCarrito(payload.codigoCarrito);
    }
    async obtenerReembolsos(payload) {
        return await this.paymentsService.obtenerReembolsos(payload.codigoCarrito);
    }
    async verMotivoRechazo(payload) {
        return await this.paymentsService.verMotivoRechazo(payload.codigoCarrito);
    }
    async actualizarEstadoPago(payload) {
        return await this.paymentsService.actualizarEstadoPago(payload.idTransaccion, payload.estado, payload.respuestaPagopar, payload.respuestaBancard, payload.motivoFallo);
    }
    async healthCheck() {
        return {
            status: 'ok',
            service: 'payments',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'registrar_pago' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "registrarPago", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'listar_pagos_carrito' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "listarPagosPorCarrito", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'obtener_reembolsos' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "obtenerReembolsos", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'ver_motivo_rechazo' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verMotivoRechazo", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'actualizar_estado_pago' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "actualizarEstadoPago", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'health_check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "healthCheck", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map