import { OrderItem } from './order-item.schemas';
export declare class Order {
    id: number;
    codigo: string;
    carrito_codigo: number;
    cliente_documento: string;
    total: number;
    evento_id: string;
    datos_envio: Record<string, any>;
    datos_pago: Record<string, any>;
    estado: number;
    fecha_creacion: Date;
    fecha_actualizacion: Date;
    items: OrderItem[];
}
