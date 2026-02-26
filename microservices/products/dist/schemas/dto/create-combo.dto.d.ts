export declare class CreateComboDto {
    codigo: string;
    codigoBarra: string;
    marca: Record<string, any>;
    modelo: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    costo: number;
    venta: number;
    cantidad: number;
    categorias?: Array<{
        _id: string;
        nombre: string;
        ruta: string;
    }>;
    subcategorias?: Array<{
        _id: string;
        nombre: string;
        ruta: string;
    }>;
    caracteristicas?: Array<{
        tipo: string;
        dato: string;
    }>;
    imagenes?: string[];
    prioridad?: number;
    web?: number;
    websc?: number;
    deposito?: string;
}
