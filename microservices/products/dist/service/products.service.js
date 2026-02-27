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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const product_schema_1 = require("@products/schemas/product.schema");
const promos_service_1 = require("./promos.service");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const combos_schema_1 = require("@products/schemas/combos.schema");
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(productModel, combosModel, promosService) {
        this.productModel = productModel;
        this.combosModel = combosModel;
        this.promosService = promosService;
        this.logger = new common_1.Logger(ProductsService_1.name);
        this.productosCache = new Map();
        this.productoPorCodigoCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000;
        this.PRODUCT_CACHE_TTL = 5 * 60 * 1000;
        this.MAX_CACHE_ENTRIES = 50;
        this.camposNecesarios = {
            nombre: 1,
            precio: 1,
            venta: 1,
            ruta: 1,
            codigo: 1,
            'imagenes.url.300': 1,
            'categorias.nombre': 1,
            descuento: 1,
        };
    }
    getCacheKey(filters) {
        return JSON.stringify({
            limit: filters.limit,
            offset: filters.offset,
            categoria: filters.categoria,
            subcategoria: filters.subcategoria,
            precioMin: filters.precioMin,
            precioMax: filters.precioMax,
            search: filters.search,
            nombre: filters.nombre,
        });
    }
    invalidateCache() {
        this.productosCache.clear();
        this.productoPorCodigoCache.clear();
    }
    async getCachedProductos(filters = {}) {
        const cacheKey = this.getCacheKey(filters);
        const now = Date.now();
        const cached = this.productosCache.get(cacheKey);
        if (cached && now - cached.timestamp <= this.CACHE_TTL) {
            return { data: cached.data, total: cached.total };
        }
        const query = {
            estado: { $ne: 0 },
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        };
        if (filters.categoria)
            query['categorias._id'] = filters.categoria;
        if (filters.subcategoria)
            query['subcategorias._id'] = filters.subcategoria;
        if (filters.precioMin || filters.precioMax) {
            if (filters.precioMin)
                query.venta.$gte = Number(filters.precioMin);
            if (filters.precioMax)
                query.venta.$lte = Number(filters.precioMax);
        }
        if (filters.search) {
            query.$or = [{ codigo: filters.search }];
        }
        if (filters.nombre) {
            query.nombre = { $regex: filters.nombre, $options: 'i' };
        }
        const [data, total] = await Promise.all([
            this.productModel
                .find(query)
                .select(this.camposNecesarios)
                .sort({ _id: 1 })
                .skip(Number(filters.offset) || 0)
                .limit(Number(filters.limit) || 20)
                .lean(),
            this.productModel.countDocuments(query),
        ]);
        if (this.productosCache.size >= this.MAX_CACHE_ENTRIES) {
            const oldestKey = this.productosCache.keys().next().value;
            this.productosCache.delete(oldestKey);
        }
        this.productosCache.set(cacheKey, { data, total, timestamp: now });
        return { data, total };
    }
    async findAll(filters = {}) {
        return this.getCachedProductos(filters);
    }
    async findOne(id) {
        const product = await this.productModel
            .findOne({
            _id: id,
            estado: { $ne: 0 },
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        })
            .lean();
        if (!product) {
            throw new common_1.NotFoundException(`Producto con ID ${id} no encontrado`);
        }
        return product;
    }
    async findByCode(codigo) {
        return this.productModel
            .findOne({
            codigo,
            estado: { $ne: 0 },
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        })
            .lean();
    }
    async create(createProductDto) {
        const createdProduct = new this.productModel({
            ...createProductDto,
            estado: 1,
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date(),
        });
        this.invalidateCache();
        return createdProduct.save();
    }
    async createCombo(createCombo) {
        return await this.combosModel.create(createCombo);
    }
    async update(id, updateProductDto) {
        const updatedProduct = await this.productModel
            .findByIdAndUpdate(id, { ...updateProductDto, fecha_actualizacion: new Date() }, { new: true })
            .lean();
        if (!updatedProduct) {
            throw new common_1.NotFoundException(`Producto con ID ${id} no encontrado`);
        }
        this.invalidateCache();
        return updatedProduct;
    }
    async searchProducts(filters = {}) {
        const query = {
            nombre: { $regex: filters.search, $options: 'i' },
            estado: 1,
            web: 1,
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        };
        const total = await this.productModel.countDocuments(query);
        const productos = await this.productModel
            .find(query)
            .sort({ prioridad: -1, _id: 1 })
            .limit(total === 1 ? 1 : 4)
            .lean();
        return { data: productos, total };
    }
    async getProductsByCategory(categoryId, limit = 10, offset = 0) {
        const query = {
            'categorias._id': categoryId,
            estado: 1,
            web: 1,
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        };
        const [data, total] = await Promise.all([
            this.productModel
                .find(query)
                .sort({ prioridad: -1, _id: 1 })
                .skip(Number(offset))
                .limit(Number(limit))
                .lean(),
            this.productModel.countDocuments(query),
        ]);
        return { data, total };
    }
    async getProductsJota() {
        const query = {
            nombre: RegExp('jota', 'i'),
            estado: 1,
            web: 1,
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 },
        };
        const [data, total] = await Promise.all([
            this.productModel
                .find(query)
                .select(this.camposNecesarios)
                .sort({ prioridad: -1, _id: 1 })
                .limit(10)
                .lean(),
            this.productModel.countDocuments(query),
        ]);
        return { data, total };
    }
    async findByIds(ids, fields, filters = {}) {
        if (!ids || ids.length === 0)
            return [];
        const now = Date.now();
        const projection = fields
            ? fields
                .split(',')
                .reduce((acc, field) => ({ ...acc, [field.trim()]: 1 }), {
                _id: 0,
                codigo: 1,
            })
            : { _id: 0, codigo: 1 };
        const productosEnCache = [];
        const codigosFaltantes = [];
        for (const codigo of ids) {
            const cached = this.productoPorCodigoCache.get(codigo);
            if (cached && now - cached.timestamp <= this.PRODUCT_CACHE_TTL) {
                productosEnCache.push(cached.data);
            }
            else {
                codigosFaltantes.push(codigo);
            }
        }
        let productosDB = [];
        if (codigosFaltantes.length > 0) {
            productosDB = await this.productModel
                .find({
                codigo: { $in: codigosFaltantes },
                estado: { $ne: 0 },
                imagenes: { $exists: true, $ne: [] },
                dias_ultimo_movimiento: { $lte: 30 },
            }, projection)
                .sort({ prioridad: -1, _id: 1 })
                .lean();
            for (const prod of productosDB) {
                if (prod && prod.codigo) {
                    this.productoPorCodigoCache.set(prod.codigo, {
                        data: prod,
                        timestamp: now,
                    });
                }
            }
        }
        const productosPorCodigo = {};
        [...productosEnCache, ...productosDB].forEach((prod) => {
            if (prod && prod.codigo)
                productosPorCodigo[prod.codigo] = prod;
        });
        const productosFinal = ids
            .map((codigo) => productosPorCodigo[codigo])
            .filter(Boolean);
        const offset = Number(filters.offset) || 0;
        const limit = Number(filters.limit) || productosFinal.length;
        return productosFinal.slice(offset, offset + limit);
    }
    async findByPromos(filters = {}) {
        const promos = await this.promosService.findAll(filters);
        const codigos = promos
            .flatMap((promo) => Array.isArray(promo.contenido?.producto)
            ? promo.contenido.producto.map((p) => p.codigo)
            : [])
            .filter((codigo) => !!codigo);
        return this.findByIds(codigos, filters.fields, filters);
    }
    async findComboByCodigo(codigo) {
        const filtro = {
            codigo,
            estado: 1,
            precio: { $gt: 9000 },
            imagenes: { $size: { $gt: 0 } },
            web: 1,
            $or: [
                { cantidad: { $gt: 0 }, dias_ultimo_movimiento: { $lte: 30 } },
                { cantidad: 0, dias_ultimo_movimiento: { $lt: 30 } },
            ],
        };
        return this.combosModel.findOne(filtro).lean();
    }
    async getCategories() {
        try {
            const pipeline = [
                { $unwind: '$categorias' },
                { $group: { _id: '$categorias' } },
                { $sort: { _id: 1 } },
                { $limit: 20 },
                { $project: { _id: 0, categoria: '$_id' } },
            ];
            const result = await this.productModel.aggregate(pipeline).exec();
            const categorias = result.map((item) => item.categoria);
            return { categorias };
        }
        catch (error) {
            this.logger.error('Error al obtener categorías:', error);
            return { categorias: [] };
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_2.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, mongoose_2.InjectModel)(combos_schema_1.Combos.name)),
    __metadata("design:paramtypes", [mongoose_1.Model,
        mongoose_1.Model,
        promos_service_1.PromosService])
], ProductsService);
//# sourceMappingURL=products.service.js.map