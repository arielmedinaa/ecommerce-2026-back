import { Response } from 'express';
import { BannerService } from '../../service/image.banners.service';
export declare class ImageHttpController {
    private readonly bannerService;
    private readonly logger;
    constructor(bannerService: BannerService);
    getAllBanners(body: {
        fields?: string[];
    }): Promise<{
        data: import("../../schemas/banners/banners.schema").Banners[];
        message: string;
        success: boolean;
    }>;
    serveBannerImage(nombre: string, device: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    serveBannerImageDefault(nombre: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
}
