import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { ProductsService } from '@products/service/products.service';
import { Product } from '@products/schemas/product.schema';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
import { Combos } from '@products/schemas/combos.schema';
import { OfertasService } from '@products/service/ofertas.service';
export declare class ProductsController {
    private readonly productsService;
    private readonly ofertasService;
    private readonly logger;
    constructor(productsService: ProductsService, ofertasService: OfertasService);
    createProduct(createProductDto: CreateProductDto): Promise<Product>;
    createCombo(createComboDto: CreateComboDto): Promise<Combos>;
    findAll(filters: {
        offset: number;
        limit: number;
    }): Promise<{
        data: Product[];
        total: number;
    }>;
    findByPromos(filters?: any): Promise<any[]>;
    searchProducts(filters?: any): Promise<{
        data: Product[];
        total: number;
    }>;
    searchComboByCodigo(codigo: string): Promise<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getCategories(): Promise<{
        categorias: string[];
    }>;
    getProductsJota(): Promise<{
        data: (Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
    }>;
    createOferta(ofertaData: any): Promise<{
        data: any;
        message: string;
        success: boolean;
    }>;
    getOfertas(): Promise<{
        data: any[];
        message: string;
        success: boolean;
    }>;
}
