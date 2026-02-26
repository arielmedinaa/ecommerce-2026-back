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
exports.LandingsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const landings_service_1 = require("../service/landings.service");
let LandingsController = class LandingsController {
    constructor(landingsService) {
        this.landingsService = landingsService;
    }
    async crearLanding(payload) {
        const { createLandingDto, usuario } = payload;
        return this.landingsService.crearLanding(createLandingDto, usuario);
    }
    async getAllLandings(payload) {
        const { page, limit, filters } = payload;
        return this.landingsService.getAllLandings(page, limit, filters);
    }
    async getActiveLandings(payload) {
        const { page, limit } = payload;
        return this.landingsService.getActiveLandings(page, limit);
    }
    async getLandingById(payload) {
        const { id } = payload;
        return this.landingsService.getLandingById(id);
    }
    async updateLanding(payload) {
        const { id, updateLandingDto, userId } = payload;
        return this.landingsService.updateLanding(id, updateLandingDto, userId);
    }
    async deleteLanding(payload) {
        const { id } = payload;
        return this.landingsService.deleteLanding(id);
    }
    async getAllFormatos(payload) {
        const { page, limit, filters } = payload;
        return this.landingsService.getAllFormatos(page, limit, filters);
    }
    async getFormatoById(payload) {
        const { id } = payload;
        return this.landingsService.getFormatoById(id);
    }
    async getPredefinedTemplates() {
        return this.landingsService.getPredefinedTemplates();
    }
};
exports.LandingsController = LandingsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'crearLanding' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "crearLanding", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getAllLandings' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getAllLandings", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getActiveLandings' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getActiveLandings", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getLandingById' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getLandingById", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'updateLanding' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "updateLanding", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'deleteLanding' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "deleteLanding", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getAllFormatos' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getAllFormatos", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getFormatoById' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getFormatoById", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'getPredefinedTemplates' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LandingsController.prototype, "getPredefinedTemplates", null);
exports.LandingsController = LandingsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [landings_service_1.LandingsService])
], LandingsController);
//# sourceMappingURL=landings.controller.js.map