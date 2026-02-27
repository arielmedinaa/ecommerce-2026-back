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
var ProductsController_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const create_product_dto_1 = require("@products/schemas/dto/create-product.dto");
const products_service_1 = require("@products/service/products.service");
const create_combo_dto_1 = require("@products/schemas/dto/create-combo.dto");
const ofertas_service_1 = require("@products/service/ofertas.service");
let ProductsController = ProductsController_1 = class ProductsController {
    constructor(productsService, ofertasService) {
        this.productsService = productsService;
        this.ofertasService = ofertasService;
        this.logger = new common_1.Logger(ProductsController_1.name);
    }
    createProduct(createProductDto) {
        return this.productsService.create(createProductDto);
    }
    createCombo(createComboDto) {
        return this.productsService.createCombo(createComboDto);
    }
    async findAll(filters) {
        try {
            const products = await this.productsService.findAll(filters);
            return products;
        }
        catch (error) {
            this.logger.error('Error in get_products:', error);
            throw error;
        }
    }
    async findByPromos(filters = {}) {
        try {
            return await this.productsService.findByPromos(filters);
        }
        catch (error) {
            this.logger.error('Error in findByPromos:', error);
            throw error;
        }
    }
    async searchProducts(filters = {}) {
        try {
            return await this.productsService.searchProducts(filters);
        }
        catch (error) {
            this.logger.error('Error in searchProducts:', error);
            throw error;
        }
    }
    async searchComboByCodigo(codigo) {
        return await this.productsService.findComboByCodigo(codigo);
    }
    async getCategories() {
        try {
            return await this.productsService.getCategories();
        }
        catch (error) {
            this.logger.error('Error in get_categories:', error);
            throw error;
        }
    }
    async getProductsJota() {
        return await this.productsService.getProductsJota();
    }
    async createOferta(ofertaData) {
        return await this.ofertasService.createOrUpdateOferta(ofertaData);
    }
    async getOfertas() {
        return await this.ofertasService.getAllOfertas();
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'createProducts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof create_product_dto_1.CreateProductDto !== "undefined" && create_product_dto_1.CreateProductDto) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'createCombo' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof create_combo_dto_1.CreateComboDto !== "undefined" && create_combo_dto_1.CreateComboDto) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createCombo", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_products' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_products_by_promos' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByPromos", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'search_products' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "searchProducts", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'search_combo_by_codigo' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "searchComboByCodigo", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getCategories", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_products_jota' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductsJota", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'create_oferta' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createOferta", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_ofertas' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getOfertas", null);
exports.ProductsController = ProductsController = ProductsController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof products_service_1.ProductsService !== "undefined" && products_service_1.ProductsService) === "function" ? _a : Object, typeof (_b = typeof ofertas_service_1.OfertasService !== "undefined" && ofertas_service_1.OfertasService) === "function" ? _b : Object])
], ProductsController);
//# sourceMappingURL=products.controller.js.map