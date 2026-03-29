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
var HomeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const response_data_1 = require("../../../../shared/common/response/response.data");
const resilient_client_decorator_1 = require("../../../../shared/common/decorators/resilient-client.decorator");
const fallback_data_service_1 = require("../../../../shared/common/services/fallback-data.service");
let HomeService = HomeService_1 = class HomeService {
    constructor(resilientService, fallbackDataService, productsClient, imageClient) {
        this.resilientService = resilientService;
        this.fallbackDataService = fallbackDataService;
        this.productsClient = productsClient;
        this.imageClient = imageClient;
        this.logger = new common_1.Logger(HomeService_1.name);
        this.fieldsImage = ['nombre', 'imagen', 'variante', 'estado'];
        this.homeDataCache = new Map();
        this.HOME_TTL = 30 * 1000;
    }
    async getHomeData(filter) {
        const limit = filter.limit || 6;
        const offset = filter.offset || 0;
        const category = filter.category || 'all';
        const cacheKey = `home_${category}_${limit}_${offset}`;
        const now = Date.now();
        const cached = this.homeDataCache.get(cacheKey);
        if (cached && now - cached.timestamp < this.HOME_TTL) {
            return cached.data;
        }
        try {
            const resilientOptions = {
                retries: 3,
                delay: 1000,
                fallback: async () => {
                    this.logger.warn('Using fallback products');
                    return {
                        data: this.fallbackDataService.getFallbackProducts(limit),
                        total: this.fallbackDataService.getFallbackProducts().length,
                    };
                },
                circuitBreaker: {
                    failureThreshold: 3,
                    resetTimeout: 30000,
                },
            };
            const banners = await this.resilientService.sendWithResilience(this.imageClient, { cmd: 'get_all_banners' }, { fields: this.fieldsImage }, resilientOptions);
            const [jota, ofertas, productos] = await Promise.all([
                this.resilientService.sendWithResilience(this.productsClient, { cmd: 'get_products_jota' }, {}, resilientOptions),
                this.resilientService.sendWithResilience(this.productsClient, { cmd: 'get_ofertas' }, {}, resilientOptions),
                this.resilientService.sendWithResilience(this.productsClient, { cmd: 'get_products' }, {
                    limit,
                    offset,
                    categoria: filter.category,
                    fields: [
                        'nombre',
                        'precio',
                        'venta',
                        'ruta',
                        'imagenes',
                        'descuento',
                    ],
                }, resilientOptions),
            ]);
            this.fallbackDataService.saveSuccessfulResponse(productos, 'products');
            this.fallbackDataService.saveSuccessfulResponse(jota, 'jota');
            const response = new response_data_1.ResponseData();
            response.data = {
                banners: banners.data || [],
                productos: productos.data || [],
                jota: jota || [],
                ofertasExpress: ofertas.data || [],
            };
            response.status = 200;
            response.register = productos.total || 0;
            this.homeDataCache.set(cacheKey, { data: response, timestamp: now });
            return response;
        }
        catch (error) {
            this.logger.error('Error en getHomeData:', error);
            const fallbackProducts = this.fallbackDataService.getFallbackProducts(limit);
            const fallbackJota = this.fallbackDataService.getFallbackJota();
            const response = new response_data_1.ResponseData();
            response.data = {
                banners: [],
                productos: fallbackProducts,
                jota: fallbackJota,
                ofertasExpress: [],
            };
            response.status = 200;
            response.register = fallbackProducts.length;
            return response;
        }
    }
};
exports.HomeService = HomeService;
exports.HomeService = HomeService = HomeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('PRODUCTS_SERVICE')),
    __param(3, (0, common_1.Inject)('IMAGE_SERVICE')),
    __metadata("design:paramtypes", [resilient_client_decorator_1.ResilientService,
        fallback_data_service_1.FallbackDataService,
        microservices_1.ClientProxy,
        microservices_1.ClientProxy])
], HomeService);
//# sourceMappingURL=home.service.js.map