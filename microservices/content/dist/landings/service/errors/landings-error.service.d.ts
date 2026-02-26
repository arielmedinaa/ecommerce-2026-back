import { Model } from 'mongoose';
import { LandingError, LandingErrorDocument } from '@landings/schemas/errors/landings.error.schema';
export declare class LandingErrorService {
    private readonly landingErrorModel;
    private readonly logger;
    constructor(landingErrorModel: Model<LandingErrorDocument>);
    logMicroserviceError(error: Error, landingId?: string, operation?: string, context?: Record<string, any>): Promise<void>;
    getErrorLogs(page?: number, limit?: number, filters?: any): Promise<{
        errors: LandingError[];
        total: number;
        pages: number;
        currentPage: number;
    }>;
    getErrorById(id: string): Promise<LandingError>;
    getErrorsByLandingId(landingId: string): Promise<LandingError[]>;
    getErrorStats(): Promise<any>;
    clearOldErrors(daysOld?: number): Promise<void>;
    private buildErrorQuery;
}
