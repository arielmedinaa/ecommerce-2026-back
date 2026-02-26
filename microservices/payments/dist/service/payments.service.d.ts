import { Model } from 'mongoose';
import { Payments, PaymentsDocument } from '../schemas/payments.schema';
import { PaymentErrorService } from './errors/payment-error.service';
export declare class PaymentsService {
    private readonly paymentsModel;
    private readonly paymentErrorService;
    constructor(paymentsModel: Model<PaymentsDocument>, paymentErrorService: PaymentErrorService);
    registrarPago(codigoCarrito: number, carrito: any, metodoPago: string, monto: number, moneda?: string, cliente?: any, descripcion?: string, respuestaPagopar?: any, respuestaBancard?: any): Promise<{
        data: Payments | null;
        success: boolean;
        message: string;
    }>;
    listarPagosPorCarrito(codigoCarrito: number): Promise<{
        data: Payments[];
        success: boolean;
        message: string;
    }>;
    obtenerReembolsos(codigoCarrito: number): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    verMotivoRechazo(codigoCarrito: number): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    actualizarEstadoPago(idTransaccion: string, estado: string, respuestaPagopar?: any, respuestaBancard?: any, motivoFallo?: string): Promise<{
        data: Payments | null;
        success: boolean;
        message: string;
    }>;
    private generarIdTransaccion;
    private calcularFechaExpiracion;
}
