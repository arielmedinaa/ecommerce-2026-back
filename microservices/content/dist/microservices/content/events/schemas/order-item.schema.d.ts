import { Order } from './order.schema';
export declare class OrderItem {
    id: number;
    orden: Order;
    orden_id: number;
    producto_codigo: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    evento_id: number;
    fecha_creacion: Date;
}
