export declare class LandingError {
    id: string;
    landingId?: string;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
    userId?: string;
    operation?: string;
    requestPayload?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
