import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly userModel;
    private readonly jwtService;
    private readonly logger;
    constructor(userModel: Model<User>, jwtService: JwtService);
    validateGoogleUser(profile: any): Promise<User>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
            avatar: any;
        };
    }>;
    extractTokenFromContext(context: any): Promise<string | null>;
    validateToken(token: string): Promise<any>;
}
