import { Cart } from '@cart/schemas/cart.schemas';
export declare const DEFAULT_CART: Partial<Cart>;
export declare const DEFAULT_SOLICITUD: Partial<Cart>;
export declare const NEW_CART_INITIAL_STATE: (codigo: number, clienteToken: string, cuenta: string) => Partial<Cart>;
export declare const NEW_SOLICITUD_INITIAL_STATE: (codigo: number, clienteToken: string, cuenta: string) => Partial<Cart>;
export declare const ESTADO_SOLICITUD_MAP: {
    '01': string;
    '02': string;
    '04': string;
    '07': string;
    '10': string;
    '13': string;
    '22': string;
    '23': string;
    '05': string;
    '16': string;
};
