import { Event } from './event.schema';
export declare class EventProduct {
    id: number;
    evento: Event;
    evento_id: number;
    producto_codigo: string;
    limitePorUsuario: number;
    precioOferta?: number;
    createdAt: Date;
}
