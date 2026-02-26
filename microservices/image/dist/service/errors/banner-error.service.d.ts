import { Model } from 'mongoose';
import { BannerErrorDocument } from '../../schemas/errors/banners.error.schema';
export declare class BannerErrorService {
    private readonly bannerErrorModel;
    constructor(bannerErrorModel: Model<BannerErrorDocument>);
    logError(bannerId: string, errorCode: string, message: string, context?: Record<string, any>, stackTrace?: string, path?: string, operation?: string, userId?: string, fileName?: string, device?: string): Promise<BannerErrorDocument | null>;
    logMicroserviceError(error: any, bannerId?: string, operation?: string, additionalContext?: Record<string, any>, userId?: string, fileName?: string, device?: string): Promise<BannerErrorDocument | null>;
    logValidationError(bannerId: string, operation: string, motivo: string, additionalData?: Record<string, any>, userId?: string): Promise<BannerErrorDocument | null>;
    logFileProcessingError(bannerId: string, fileName: string, device: string, error: any, operation?: string, userId?: string): Promise<BannerErrorDocument | null>;
    getErrorLogs(bannerId?: string, limit?: number): Promise<BannerErrorDocument[]>;
    getErrorStats(): Promise<any>;
    getErrorsByOperation(operation: string, limit?: number): Promise<BannerErrorDocument[]>;
    getErrorsByDevice(device: string, limit?: number): Promise<BannerErrorDocument[]>;
    clearOldLogs(daysOld?: number): Promise<{
        deletedCount: number;
    }>;
}
