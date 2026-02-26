import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { GuestToken } from '../schemas/guest-token.schema';
export declare class GuestService {
    private readonly guestTokenModel;
    private readonly userModel;
    private readonly logger;
    constructor(guestTokenModel: Model<GuestToken>, userModel: Model<User>);
    createGuestToken(ipAddress: string, userAgent: string): Promise<{
        token: string;
        user: any;
    }>;
    validateGuestToken(token: string, ipAddress: string): Promise<User | null>;
    revokeGuestToken(token: string): Promise<void>;
}
