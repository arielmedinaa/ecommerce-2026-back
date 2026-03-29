export interface FallbackProduct {
    codigo: string;
    nombre: string;
    precio: number;
    venta: number;
    ruta: string;
    imagenes: Array<{
        url: {
            [key: string]: string;
        };
    }>;
    descuento?: number;
    categorias?: Array<{
        nombre: string;
    }>;
}
export interface FallbackHomeData {
    productos: FallbackProduct[];
    jota: FallbackProduct[];
    categorias: string[];
    banners: Array<{
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        url: string;
        order: number;
    }>;
}
export declare class FallbackDataService {
    private readonly logger;
    private readonly fallbackDataPath;
    constructor();
    private initializeFallbackData;
    private getDefaultProducts;
    private getDefaultBanners;
    getFallbackHomeData(): FallbackHomeData;
    getFallbackProducts(limit?: number): FallbackProduct[];
    getFallbackJota(): FallbackProduct[];
    getFallbackCategories(): string[];
    getFallbackBanners(): {
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        url: string;
        order: number;
    }[];
    updateFallbackData(newData: Partial<FallbackHomeData>): void;
    private saveFallbackData;
    saveSuccessfulResponse(data: any, type: 'products' | 'categories' | 'jota'): void;
}
