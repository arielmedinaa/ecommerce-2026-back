import { Model } from 'mongoose';
import { CartErrorDocument } from '../../schemas/errors/cart.error.schema';
export declare class CartErrorService {
    private readonly cartErrorModel;
    constructor(cartErrorModel: Model<CartErrorDocument>);
    logError(cartId: string, errorCode: string, message: string, context?: Record<string, any>, stackTrace?: string, path?: string): Promise<CartErrorDocument | null>;
    logMicroserviceError(error: any, cartId?: string, operation?: string, additionalContext?: Record<string, any>): Promise<CartErrorDocument | null>;
    getErrorLogs(cartId?: string, limit?: number): Promise<CartErrorDocument[]>;
    getErrorStats(): Promise<any>;
}
