import { IsString, IsNumber, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateProductDto {
    @IsString()
    codigo: string;

    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsNumber()
    precio: number;

    @IsNumber()
    costo: number;

    @IsNumber()
    venta: number;

    @IsNumber()
    cantidad: number;

    @IsArray()
    @IsOptional()
    categorias?: Array<{
        _id: string;
        nombre: string;
        ruta: string;
    }>;

    @IsArray()
    @IsOptional()
    subcategorias?: Array<{
        _id: string;
        nombre: string;
        ruta: string;
    }>;

    @IsArray()
    @IsOptional()
    caracteristicas?: Array<{
        tipo: string;
        dato: string;
    }>;

    @IsArray()
    @IsOptional()
    imagenes?: Array<{
        variante: string;
        formato: string;
        url: {
            '60': string;
            '100': string;
            '300': string;
            '600': string;
            '1000': string;
        };
    }>;

    @IsNumber()
    @IsOptional()
    prioridad?: number;

    @IsNumber()
    @IsOptional()
    web?: number;

    @IsString()
    @IsOptional()
    deposito?: string;
}