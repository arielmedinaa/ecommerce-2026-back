import { Model } from 'mongoose';
import { Promo } from '@products/schemas/promos.schema';
export declare class PromosService {
    private readonly promoModel;
    constructor(promoModel: Model<Promo>);
    findAll(filters?: any): Promise<Promo[]>;
}
