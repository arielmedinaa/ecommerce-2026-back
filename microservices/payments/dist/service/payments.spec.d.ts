import { PaymentErrorService } from './errors/payment-error.service';
export declare class PaymentsValidationService {
    private readonly paymentErrorService;
    private readonly logger;
    constructor(paymentErrorService: PaymentErrorService);
    validatePaymentPayload(codigoCarrito: number, carrito: any, metodoPago: string, monto: number, moneda: string, cliente?: any, descripcion?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validatePaymentUpdate(idTransaccion: string, estado: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
}
