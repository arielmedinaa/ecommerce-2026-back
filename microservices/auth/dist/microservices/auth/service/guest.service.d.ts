import { Repository } from 'typeorm';
import { User } from '../schemas/user.schemas';
import { JwtService } from '@nestjs/jwt';
export declare class GuestService {
    private readonly userRepository;
    private readonly jwtService;
    constructor(userRepository: Repository<User>, jwtService: JwtService);
    createGuestToken(ipAddress: string, userAgent: string): Promise<{
        token: string;
        user: any;
    }>;
}
