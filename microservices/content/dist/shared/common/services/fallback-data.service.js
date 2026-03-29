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
var FallbackDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackDataService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let FallbackDataService = FallbackDataService_1 = class FallbackDataService {
    constructor() {
        this.logger = new common_1.Logger(FallbackDataService_1.name);
        this.fallbackDataPath = (0, path_1.join)(process.cwd(), 'fallback-data.json');
        this.initializeFallbackData();
    }
    initializeFallbackData() {
        if (!(0, fs_1.existsSync)(this.fallbackDataPath)) {
            const defaultFallbackData = {
                productos: this.getDefaultProducts(),
                jota: this.getDefaultProducts(),
                categorias: ['Electrónica', 'Ropa', 'Hogar', 'Deportes'],
                banners: this.getDefaultBanners(),
            };
            this.saveFallbackData(defaultFallbackData);
        }
    }
    getDefaultProducts() {
        return [
            {
                codigo: 'DEFAULT001',
                nombre: 'Producto Popular',
                precio: 50000,
                venta: 45000,
                ruta: 'producto-popular',
                imagenes: [
                    {
                        url: {
                            '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+1',
                        },
                    },
                ],
                descuento: 10,
                categorias: [{ nombre: 'Electrónica' }],
            },
            {
                codigo: 'DEFAULT002',
                nombre: 'Oferta Especial',
                precio: 75000,
                venta: 60000,
                ruta: 'oferta-especial',
                imagenes: [
                    {
                        url: {
                            '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+2',
                        },
                    },
                ],
                descuento: 20,
                categorias: [{ nombre: 'Ropa' }],
            },
            {
                codigo: 'DEFAULT003',
                nombre: 'Producto Nuevo',
                precio: 100000,
                venta: 95000,
                ruta: 'producto-nuevo',
                imagenes: [
                    {
                        url: {
                            '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+3',
                        },
                    },
                ],
                descuento: 5,
                categorias: [{ nombre: 'Hogar' }],
            },
        ];
    }
    getDefaultBanners() {
        return [
            {
                id: '1',
                title: 'Bienvenidos',
                description: 'Las mejores ofertas te esperan',
                imageUrl: 'https://via.placeholder.com/1200x400/cccccc/000000?text=Bienvenidos',
                url: '/',
                order: 1,
            },
            {
                id: '2',
                title: 'Promociones',
                description: 'Hasta 50% de descuento',
                imageUrl: 'https://via.placeholder.com/1200x400/cccccc/000000?text=Promociones',
                url: '/promos',
                order: 2,
            },
        ];
    }
    getFallbackHomeData() {
        try {
            if ((0, fs_1.existsSync)(this.fallbackDataPath)) {
                const data = (0, fs_1.readFileSync)(this.fallbackDataPath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            this.logger.error('Error reading fallback data:', error);
        }
        return {
            productos: this.getDefaultProducts(),
            categorias: ['Electrónica', 'Ropa', 'Hogar', 'Deportes'],
            banners: this.getDefaultBanners(),
            jota: this.getDefaultProducts(),
        };
    }
    getFallbackProducts(limit = 6) {
        const data = this.getFallbackHomeData();
        return data.productos.slice(0, limit);
    }
    getFallbackJota() {
        const data = this.getFallbackHomeData();
        return data.jota;
    }
    getFallbackCategories() {
        const data = this.getFallbackHomeData();
        return data.categorias;
    }
    getFallbackBanners() {
        const data = this.getFallbackHomeData();
        return data.banners;
    }
    updateFallbackData(newData) {
        try {
            const currentData = this.getFallbackHomeData();
            const updatedData = { ...currentData, ...newData };
            this.saveFallbackData(updatedData);
            this.logger.log('Fallback data updated successfully');
        }
        catch (error) {
            this.logger.error('Error updating fallback data:', error);
        }
    }
    saveFallbackData(data) {
        try {
            (0, fs_1.writeFileSync)(this.fallbackDataPath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            this.logger.error('Error saving fallback data:', error);
        }
    }
    saveSuccessfulResponse(data, type) {
        try {
            const currentData = this.getFallbackHomeData();
            if (type === 'products' && data.data) {
                currentData.productos = data.data.slice(0, 10);
            }
            else if (type === 'categories' && data.categorias) {
                currentData.categorias = data.categorias;
            }
            else if (type === 'jota' && data.data) {
                currentData.jota = data.data.slice(0, 10);
            }
            this.saveFallbackData(currentData);
            this.logger.log(`Saved successful ${type} response to fallback`);
        }
        catch (error) {
            this.logger.error(`Error saving ${type} to fallback:`, error);
        }
    }
};
exports.FallbackDataService = FallbackDataService;
exports.FallbackDataService = FallbackDataService = FallbackDataService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FallbackDataService);
//# sourceMappingURL=fallback-data.service.js.map