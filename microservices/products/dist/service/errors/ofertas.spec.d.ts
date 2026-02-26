export declare class OfertasValidationService {
    private readonly logger;
    validateOfertaPayload(createData: any, codigo?: number): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateOfertaId(id: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
}
