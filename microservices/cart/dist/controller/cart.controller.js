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
var CartController_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const cart_service_1 = require("@cart/service/cart.service");
const cart_error_service_1 = require("@cart/service/errors/cart-error.service");
let CartController = CartController_1 = class CartController {
    constructor(cartService, cartErrorService) {
        this.cartService = cartService;
        this.cartErrorService = cartErrorService;
        this.logger = new common_1.Logger(CartController_1.name);
    }
    async addToCart(payload) {
        const { token, email, codigo, body } = payload;
        try {
            const result = await this.cartService.addCart(token, email, codigo ? Number(codigo) : 0, body);
            return result;
        }
        catch (error) {
            await this.cartErrorService.logMicroserviceError(error, codigo?.toString(), 'addToCart', { payload });
            this.logger.error('Error adding to cart:', error);
            throw error;
        }
    }
    async getCart(payload) {
        const { token, cuenta, codigo } = payload;
        try {
            const result = await this.cartService.getCart(token, cuenta, codigo ? codigo : 0);
            console.log('📥 Microservice getCart - Service result:', result);
            return result;
        }
        catch (error) {
            await this.cartErrorService.logMicroserviceError(error, codigo?.toString(), 'getCart', { payload });
            console.error('🚨 Microservice getCart - Error in service:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                fullError: error
            });
            this.logger.error('Error al obtener los carritos', error);
            throw error;
        }
    }
    async getAllCartByClient(payload) {
        const { token, limit, skip, sort, order } = payload;
        return this.cartService.getAllCart(token, limit, skip, sort, order);
    }
    async finishCart(payload) {
        const { token, cuenta, codigo, process } = payload;
        try {
            const result = await this.cartService.finishCart(token, cuenta, codigo, process);
            return result;
        }
        catch (error) {
            await this.cartErrorService.logMicroserviceError(error, codigo?.toString(), 'finishCart', { payload });
            this.logger.error('Error finalizando el carrito', error);
            throw error;
        }
    }
};
exports.CartController = CartController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'add_to_cart' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "addToCart", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_cart' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCart", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: "get_all_cart" }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getAllCartByClient", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'finish_cart' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "finishCart", null);
exports.CartController = CartController = CartController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof cart_service_1.CartContadoService !== "undefined" && cart_service_1.CartContadoService) === "function" ? _a : Object, typeof (_b = typeof cart_error_service_1.CartErrorService !== "undefined" && cart_error_service_1.CartErrorService) === "function" ? _b : Object])
], CartController);
//# sourceMappingURL=cart.controller.js.map