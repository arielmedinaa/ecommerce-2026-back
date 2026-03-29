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
exports.HomeController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const home_service_1 = require("../service/home.service");
const filter_home_1 = require("../dto/filter.home");
const microservice_error_interceptor_1 = require("../../../../shared/common/interceptors/microservice-error.interceptor");
let HomeController = class HomeController {
    constructor(homeService) {
        this.homeService = homeService;
    }
    async getHomeData(filter) {
        return this.homeService.getHomeData(filter);
    }
    async getHomeDataQuery(filter) {
        return this.homeService.getHomeData(filter);
    }
    async healthCheck() {
        return {
            status: 'UP',
            timestamp: new Date().toISOString(),
            service: 'content-home',
        };
    }
    async getHomeContent(payload) {
        try {
            const filter = {
                limit: payload.limit,
                offset: payload.offset,
            };
            return await this.homeService.getHomeData(filter);
        }
        catch (error) {
            console.error('Error in getHomeContent:', error);
            throw error;
        }
    }
};
exports.HomeController = HomeController;
__decorate([
    (0, common_1.Post)('data'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_home_1.FilterHomeDto]),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "getHomeData", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_home_1.FilterHomeDto]),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "getHomeDataQuery", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "healthCheck", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_home_content' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "getHomeContent", null);
exports.HomeController = HomeController = __decorate([
    (0, common_1.Controller)('home'),
    (0, common_1.UseInterceptors)(microservice_error_interceptor_1.MicroserviceErrorInterceptor),
    __metadata("design:paramtypes", [home_service_1.HomeService])
], HomeController);
//# sourceMappingURL=home.controller.js.map