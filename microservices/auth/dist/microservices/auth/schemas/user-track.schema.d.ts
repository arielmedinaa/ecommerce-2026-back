export type UserTrackTipo = 'LINK_VISIT' | 'LOGIN' | 'CART' | 'PROMO_VIEW' | 'OFERTA_VIEW' | 'PAGE_VISIT' | 'PRODUCT_VIEW';
export declare class UserTrack {
    id: number;
    userId: string;
    tipo: UserTrackTipo;
    metadata?: Record<string, any>;
    createdAt: Date;
}
