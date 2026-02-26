import { Model } from 'mongoose';
import { PaymentErrorDocument } from '../../schemas/errors/payment.error.schema';
export declare class PaymentErrorService {
    private readonly paymentErrorModel;
    constructor(paymentErrorModel: Model<PaymentErrorDocument>);
    logError(paymentId: string, errorCode: string, message: string, context?: Record<string, any>, stackTrace?: string, path?: string): Promise<PaymentErrorDocument | null>;
    logMicroserviceError(error: any, paymentId?: string, operation?: string, additionalContext?: Record<string, any>): Promise<PaymentErrorDocument | null>;
    getErrorLogs(paymentId?: string, limit?: number): Promise<PaymentErrorDocument[]>;
    getErrorStats(): Promise<any>;
    getPaymentErrorHistory(paymentId: string): Promise<PaymentErrorDocument[]>;
    logPaymentGatewayError(paymentId: string, gateway: string, gatewayResponse: any, error: any): Promise<PaymentErrorDocument | null>;
    logValidationError(paymentId: string, field: string, value: any, validationRule: string): Promise<PaymentErrorDocument | null>;
}
