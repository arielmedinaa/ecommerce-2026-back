import { Model } from 'mongoose';
import { Banners, BannersDocument } from '../schemas/banners/banners.schema';
import { BannerValidationService } from './errors/image.spec';
import { BannerErrorService } from './errors/banner-error.service';
export declare class BannerService {
    private readonly bannerModel;
    private readonly bannerValidationService;
    private readonly bannerErrorService;
    private readonly logger;
    private readonly bannersDir;
    private readonly dimensions;
    constructor(bannerModel: Model<BannersDocument>, bannerValidationService: BannerValidationService, bannerErrorService: BannerErrorService);
    private ensureDirectoryExists;
    uploadBanner(file: any, nombre: string, variante: string, creadoPor: string, modificadoPor: string): Promise<{
        data: Banners;
        message: string;
        success: boolean;
    }>;
    private processAndSaveImages;
    getBannerImage(nombre: string, device?: string): Promise<string>;
    getAllBanners(fields?: string[]): Promise<{
        data: Banners[];
        message: string;
        success: boolean;
    }>;
    getBannerById(id: string): Promise<{
        data: Banners;
        message: string;
        success: boolean;
    }>;
    deleteBanner(id: string): Promise<{
        data: null;
        message: string;
        success: boolean;
    }>;
    toggleBannerStatus(id: string): Promise<{
        data: Banners;
        message: string;
        success: boolean;
    }>;
    getAvailableDimensions(): {
        [key: string]: {
            width: number;
            height: number;
        };
    };
}
