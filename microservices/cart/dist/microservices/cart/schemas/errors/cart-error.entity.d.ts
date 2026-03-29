export declare class CartError {
    id: number;
    cartId: string;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
    createdAt: Date;
    updatedAt: Date;
}
