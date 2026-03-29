declare class EventProductDto {
    producto_codigo: string;
    limitePorUsuario?: number;
    precioOferta?: number;
}
export declare class CreateEventDto {
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
    limiteGlobalPorUsuario?: number;
    beneficioUsuarioEspecifico?: string;
    prioridad?: number;
    idEventoPadre?: number;
    productos?: EventProductDto[];
}
export {};
