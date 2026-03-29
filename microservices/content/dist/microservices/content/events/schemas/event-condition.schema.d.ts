import { Event } from './event.schema';
export declare enum ConditionType {
    MIN_CARRITO = "MIN_CARRITO",
    MAX_UNIDADES_PEDIDO = "MAX_UNIDADES_PEDIDO",
    SOLO_NUEVOS_USUARIOS = "SOLO_NUEVOS_USUARIOS",
    METODO_PAGO_ESPECIFICO = "METODO_PAGO_ESPECIFICO"
}
export declare class EventCondition {
    id: number;
    evento: Event;
    evento_id: number;
    tipo: ConditionType;
    valor: string;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
