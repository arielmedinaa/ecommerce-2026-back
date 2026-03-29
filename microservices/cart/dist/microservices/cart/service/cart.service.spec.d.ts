import { CartErrorService } from './errors/cart-error.service';
export declare class CartValidationService {
    private readonly cartErrorService;
    private readonly logger;
    constructor(cartErrorService: CartErrorService);
    validateProduct(producto: any, codigo?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateCartPayload(clienteToken: string, cuenta: string, codigo?: number, producto?: any): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateFinishCart(clienteToken: string, cuenta?: string, codigo?: number, process?: any): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateInsertCentralApp(solicitud: Object, clienteToken: string, codigo?: number, clienteInfo?: Object): Promise<{
        isValid: boolean;
        error?: any;
    }>;
}
