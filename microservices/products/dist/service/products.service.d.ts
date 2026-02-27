import { Product } from '@products/schemas/product.schema';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { Model } from 'mongoose';
import { Combos } from '@products/schemas/combos.schema';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
export declare class ProductsService {
    private readonly productModel;
    private readonly combosModel;
    private readonly promosService;
    private readonly logger;
    constructor(productModel: Model<Product>, combosModel: Model<Combos>, promosService: PromosService);
    private productosCache;
    private productoPorCodigoCache;
    private readonly CACHE_TTL;
    private readonly PRODUCT_CACHE_TTL;
    private readonly MAX_CACHE_ENTRIES;
    private readonly camposNecesarios;
    private getCacheKey;
    invalidateCache(): void;
    private getCachedProductos;
    findAll(filters?: any): Promise<{
        data: Product[];
        total: number;
    }>;
    findOne(id: string): Promise<Product>;
    findByCode(codigo: string): Promise<Product | null>;
    create(createProductDto: CreateProductDto): Promise<Product>;
    createCombo(createCombo: CreateComboDto): Promise<Combos>;
    update(id: string, updateProductDto: CreateProductDto): Promise<Product>;
    searchProducts(filters?: any): Promise<{
        data: Product[];
        total: number;
    }>;
    getProductsByCategory(categoryId: string, limit?: number, offset?: number): Promise<{
        data: any[];
        total: number;
    }>;
    getProductsJota(): Promise<{
        data: any[];
        total: number;
    }>;
    findByIds(ids: string[], fields?: string, filters?: any): Promise<any[]>;
    findByPromos(filters?: any): Promise<any[]>;
    findComboByCodigo(codigo: string): Promise<any>;
    getCategories(): Promise<{
        categorias: string[];
    }>;
}
