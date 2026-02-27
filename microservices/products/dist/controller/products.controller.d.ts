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
    }): Promise<any>;
    findByPromos(filters?: any): Promise<any>;
    searchProducts(filters?: any): Promise<any>;
    searchComboByCodigo(codigo: string): Promise<any>;
    getCategories(): Promise<any>;
    getProductsJota(): Promise<any>;
    createOferta(ofertaData: any): Promise<any>;
    getOfertas(): Promise<any>;
}
