import { PaymentsService } from '../service/payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    registrarPago(payload: {
        codigoCarrito: number;
        carrito: any;
        metodoPago: string;
        monto: number;
        moneda?: string;
        cliente?: any;
        descripcion?: string;
        respuestaPagopar?: any;
        respuestaBancard?: any;
    }): Promise<{
        data: import("../schemas/payments.schema").Payments | null;
        success: boolean;
        message: string;
    }>;
    listarPagosPorCarrito(payload: {
        codigoCarrito: number;
    }): Promise<{
        data: import("../schemas/payments.schema").Payments[];
        success: boolean;
        message: string;
    }>;
    obtenerReembolsos(payload: {
        codigoCarrito: number;
    }): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    verMotivoRechazo(payload: {
        codigoCarrito: number;
    }): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    actualizarEstadoPago(payload: {
        idTransaccion: string;
        estado: string;
        respuestaPagopar?: any;
        respuestaBancard?: any;
        motivoFallo?: string;
    }): Promise<{
        data: import("../schemas/payments.schema").Payments | null;
        success: boolean;
        message: string;
    }>;
    healthCheck(): Promise<{
        status: string;
        service: string;
        timestamp: string;
    }>;
}
