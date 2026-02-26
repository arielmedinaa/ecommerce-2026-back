import { BannerErrorService } from './banner-error.service';
export declare class BannerValidationService {
    private readonly bannerErrorService;
    private readonly logger;
    constructor(bannerErrorService: BannerErrorService);
    validateBannerUpload(file: any, nombre: string, variante: string, creadoPor: string, modificadoPor: string, bannerId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateBannerId(id: string, operation?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateBannerUpdate(id: string, updateData: any, operation?: string, userId?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
    validateDevice(device: string, operation?: string): Promise<{
        isValid: boolean;
        error?: any;
    }>;
}
