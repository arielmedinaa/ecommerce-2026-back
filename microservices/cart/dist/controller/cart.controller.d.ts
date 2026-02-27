import { CartContadoService } from '@cart/service/cart.service';
import { CartErrorService } from '@cart/service/errors/cart-error.service';
export declare class CartController {
    private readonly cartService;
    private readonly cartErrorService;
    private readonly logger;
    constructor(cartService: CartContadoService, cartErrorService: CartErrorService);
    addToCart(payload: any): Promise<any>;
    getCart(payload: any): Promise<any>;
    getAllCartByClient(payload: any): Promise<any>;
    finishCart(payload: any): Promise<any>;
}
