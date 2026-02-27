import { Model } from 'mongoose';
import { Llave } from '@cart/schemas/llave.schema';
export declare class ObtenerClaveService {
    private readonly llaveModel;
    constructor(llaveModel: Model<Llave>);
    obtenerClave(tabla: string): Promise<number>;
}
