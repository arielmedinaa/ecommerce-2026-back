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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const events_service_1 = require("../service/events.service");
let EventsController = class EventsController {
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    async createEvent(payload) {
        const createEventDto = payload?.createEventDto || payload;
        return await this.eventsService.createEvent(createEventDto);
    }
    async listEvents(payload) {
        const { page, limit, filters } = payload;
        return await this.eventsService.findAll(page, limit, filters);
    }
    async getEvent(payload) {
        const { id } = payload;
        return await this.eventsService.findById(id);
    }
    async getActiveEvents() {
        return await this.eventsService.findActiveEvents();
    }
    async addProductToEvent(payload) {
        const { eventId, producto_codigo, limitePorUsuario } = payload;
        return await this.eventsService.addProductToEvent(eventId, producto_codigo, limitePorUsuario);
    }
    async removeProductFromEvent(payload) {
        const { eventId, producto_codigo } = payload;
        return await this.eventsService.removeProductFromEvent(eventId, producto_codigo);
    }
    async validateProductForCart(payload) {
        const { producto_codigo, cliente_id, usuario } = payload;
        return await this.eventsService.validateProductAddToCart(producto_codigo, cliente_id, usuario);
    }
    async getActiveEventForProduct(payload) {
        const { producto_codigo } = payload;
        return await this.eventsService.findActiveEventForProduct(producto_codigo);
    }
    async getEventHierarchy() {
        return await this.eventsService.findEventHierarchy();
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'crearEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "createEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'listarEventos' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "listEvents", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'obtenerEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'eventosActivos' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getActiveEvents", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'agregarProductoAEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "addProductToEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'removerProductoDeEvento' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "removeProductFromEvent", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'validarProductoParaCarrito' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "validateProductForCart", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'obtenerEventoActivoParaProducto' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getActiveEventForProduct", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'obtenerJerarquiaEventos' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getEventHierarchy", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map