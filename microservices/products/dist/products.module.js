"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const products_controller_1 = require("./controller/products.controller");
const products_service_1 = require("./service/products.service");
const promos_service_1 = require("./service/promos.service");
const mongoose_1 = require("@nestjs/mongoose");
const product_schema_1 = require("./schemas/product.schema");
const promos_schema_1 = require("./schemas/promos.schema");
const combos_schema_1 = require("./schemas/combos.schema");
const database_module_1 = require("@shared/config/database/database.module");
const ofertas_service_1 = require("./service/ofertas.service");
const ofertas_schema_1 = require("./schemas/ofertas.schema");
const ofertas_spec_1 = require("./service/errors/ofertas.spec");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule.forRoot(),
            mongoose_1.MongooseModule.forFeature([
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
                { name: promos_schema_1.Promo.name, schema: promos_schema_1.PromoSchema },
                { name: combos_schema_1.Combos.name, schema: combos_schema_1.CombosSchema },
                { name: ofertas_schema_1.Ofertas.name, schema: ofertas_schema_1.OfertasSchema },
            ]),
        ],
        controllers: [products_controller_1.ProductsController],
        providers: [products_service_1.ProductsService, promos_service_1.PromosService, ofertas_service_1.OfertasService, ofertas_spec_1.OfertasValidationService],
        exports: [products_service_1.ProductsService, promos_service_1.PromosService, ofertas_service_1.OfertasService],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map