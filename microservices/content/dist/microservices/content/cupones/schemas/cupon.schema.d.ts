export declare enum TipoDescuento {
    PORCENTAJE = "PORCENTAJE",
    MONTO_FIJO = "MONTO_FIJO"
}
export declare class Cupon {
    id: number;
    codigo: string;
    descripcion?: string;
    tipoDescuento: TipoDescuento;
    valorDescuento: number;
    porcentajeDescuento: number;
    montoMinimoCompra: number;
    fechaInicio: Date;
    fechaFin: Date;
    limiteUsos: number;
    usosActuales: number;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
