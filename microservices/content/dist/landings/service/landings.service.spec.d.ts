import { LandingErrorService } from './errors/landings-error.service';
export declare class LandingValidationService {
    private readonly landingErrorService;
    private readonly logger;
    constructor(landingErrorService: LandingErrorService);
    validateCreateLanding(createLandingDto: any, userId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateUpdateLanding(id: string, updateLandingDto: any, userId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateFormato(formatoDto: any, userId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateUpdateFormato(id: string, updateFormatoDto: any, userId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validatePaginationParams(page?: number, limit?: number): Promise<{
        isValid: boolean;
        error?: any;
        page?: number;
        limit?: number;
    }>;
    validateSlug(slug: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateTemplateKey(templateKey: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
}
