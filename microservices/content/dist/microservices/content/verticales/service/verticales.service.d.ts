import { Vertical } from '../schemas/verticales.schemas';
import { Repository } from 'typeorm';
import { VerticalValidation } from './valid/vertical.validation';
export declare class VerticalesService {
    private readonly verticalRepository;
    private readonly verticalRepositoryRead;
    private readonly verticalValidation;
    private readonly logger;
    private verticalCache;
    private readonly cacheTTL;
    constructor(verticalRepository: Repository<Vertical>, verticalRepositoryRead: Repository<Vertical>, verticalValidation: VerticalValidation);
    create(vertical: any): Promise<{
        data: Vertical;
        message: string;
        success: boolean;
    }>;
    findAll(filters?: any): Promise<{
        data: Vertical[];
        message: string;
        success: boolean;
        total?: number;
    }>;
    findOne(id: number): Promise<{
        data: Vertical;
        message: string;
        success: boolean;
    }>;
    update(id: number, verticalData: any): Promise<{
        data: Vertical;
        message: string;
        success: boolean;
    }>;
    remove(id: number): Promise<{
        message: string;
        success: boolean;
    }>;
    private invalidateCache;
}
