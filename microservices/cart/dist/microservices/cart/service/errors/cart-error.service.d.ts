import { Repository } from 'typeorm';
import { CartError } from '../../schemas/errors/cart-error.entity';
export declare class CartErrorService {
    private readonly cartErrorRepository;
    private readonly cartErrorRepositoryRead;
    constructor(cartErrorRepository: Repository<CartError>, cartErrorRepositoryRead: Repository<CartError>);
    logError(cartId: string, errorCode: string, message: string, context?: Record<string, any>, stackTrace?: string, path?: string): Promise<CartError | null>;
    logMicroserviceError(error: any, cartId?: string, operation?: string, additionalContext?: Record<string, any>): Promise<CartError | null>;
    getErrorLogs(cartId?: string, limit?: number): Promise<CartError[]>;
    getErrorStats(): Promise<any>;
}
