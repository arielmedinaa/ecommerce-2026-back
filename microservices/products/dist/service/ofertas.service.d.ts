import { Model } from 'mongoose';
import { OfertasValidationService } from './errors/ofertas.spec';
import { Ofertas } from '@products/schemas/ofertas.schema';
export declare class OfertasService {
    private readonly ofertaModel;
    private readonly ofertasValidationService;
    constructor(ofertaModel: Model<Ofertas>, ofertasValidationService: OfertasValidationService);
    createOrUpdateOferta(createData: Ofertas, codigo?: number): Promise<{
        data: any;
        message: string;
        success: boolean;
    }>;
    getActiveOferta(): Promise<{
        data: any;
        message: string;
        success: boolean;
    }>;
    getAllOfertas(): Promise<{
        data: any[];
        message: string;
        success: boolean;
    }>;
    deleteOferta(id: string): Promise<{
        data: null;
        message: string;
        success: boolean;
    }>;
    toggleOfertaStatus(id: string): Promise<{
        data: any;
        message: string;
        success: boolean;
    }>;
}
