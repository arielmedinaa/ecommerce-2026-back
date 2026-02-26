import { AuthService } from '../service/auth.service';
import { GuestService } from '../service/guest.service';
export declare class AuthController {
    private readonly authService;
    private readonly guestService;
    private readonly logger;
    constructor(authService: AuthService, guestService: GuestService);
    createGuestSession(payload: {
        ipAddress: string;
        userAgent: string;
    }): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
        };
    }>;
    validateGoogleUser(payload: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
            avatar: any;
        };
    }>;
    getUserProfile(payload: {
        token: string;
    }): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
        };
    }>;
    loginUser(payload: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
            avatar: any;
        };
    }>;
    validateGuestToken(payload: {
        token: string;
        ipAddress: string;
    }): Promise<import("../schemas/user.schema").User>;
    revokeGuestToken(payload: {
        token: string;
    }): Promise<{
        success: boolean;
    }>;
}
