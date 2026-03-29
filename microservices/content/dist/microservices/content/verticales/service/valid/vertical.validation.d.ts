import { Vertical } from '@content/verticales/schemas/verticales.schemas';
export declare class VerticalValidation {
    private readonly logger;
    validateVertical(vertical: Vertical): Promise<{
        isValid: boolean;
        error: string | null;
    }>;
    validateFilters(filters?: any): Promise<{
        isValid: boolean;
        error: string | null;
    }>;
}
