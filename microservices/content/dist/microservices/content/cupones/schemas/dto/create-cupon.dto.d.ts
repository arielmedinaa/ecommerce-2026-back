import { TipoDescuento } from '../cupon.schema';
export declare class CreateCuponDto {
    codigo: string;
    descripcion?: string;
    tipoDescuento: TipoDescuento;
    valorDescuento: number;
    porcentajeDescuento: number;
    montoMinimoCompra?: number;
    fechaInicio: string;
    fechaFin: string;
    limiteUsos: number;
    activo: boolean;
}
