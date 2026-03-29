import { CartContadoService } from '@cart/service/cart.service';
import { CartErrorService } from '@cart/service/errors/cart-error.service';
export declare class CartController {
    private readonly cartService;
    private readonly cartErrorService;
    private readonly logger;
    constructor(cartService: CartContadoService, cartErrorService: CartErrorService);
    addToCart(payload: any): Promise<{
        data: import("../schemas/cart.schemas").Cart[];
        success: boolean;
        message: string;
    }>;
    getCart(payload: any): Promise<{
        data: Record<string, any>;
        success: boolean;
        message: string;
    }>;
    getAllCartByClient(payload: any): Promise<{
        data: import("../schemas/cart.schemas").Cart[];
        success: boolean;
        message: string;
    }>;
    getMissingCart(payload: any): Promise<{
        data: import("../schemas/cart.schemas").Cart[];
        success: boolean;
        message: string;
    }>;
    finishCart(payload: any): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
}
