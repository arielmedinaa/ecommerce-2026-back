import { Response } from 'express';
import { BannerService } from '../service/image.banners.service';
export declare class BannersController {
    private readonly bannerService;
    private readonly logger;
    constructor(bannerService: BannerService);
    serveBannerImage(nombre: string, device: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    serveBannerImageDefault(nombre: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    uploadBanner(data: {
        file: any;
        nombre: string;
        variante: string;
        creadoPor: string;
        modificadoPor: string;
    }): Promise<{
        data: import("../schemas/banners/banners.schema").Banners;
        message: string;
        success: boolean;
    }>;
    getBannerImage(data: {
        nombre: string;
        device?: string;
    }): Promise<{
        data: {
            filePath: string;
        };
        message: string;
        success: boolean;
    }>;
    getAllBanners(data: {
        fields?: string[];
    }): Promise<{
        data: import("../schemas/banners/banners.schema").Banners[];
        message: string;
        success: boolean;
    }>;
    getBannerById(data: {
        id: string;
    }): Promise<{
        data: import("../schemas/banners/banners.schema").Banners;
        message: string;
        success: boolean;
    }>;
    deleteBanner(data: {
        id: string;
    }): Promise<{
        data: null;
        message: string;
        success: boolean;
    }>;
    toggleBannerStatus(data: {
        id: string;
    }): Promise<{
        data: import("../schemas/banners/banners.schema").Banners;
        message: string;
        success: boolean;
    } | {
        data: any;
        message: any;
        success: boolean;
    }>;
    getBannerDimensions(): {
        data: {
            [key: string]: {
                width: number;
                height: number;
            };
        };
        message: string;
        success: boolean;
    } | {
        data: any;
        message: any;
        success: boolean;
    };
}
