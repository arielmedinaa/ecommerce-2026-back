import { User } from '@auth/schemas/user.schemas';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserCouponService } from './user-coupon.service';
import { ClientProxy } from '@nestjs/microservices';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
export declare class AuthService {
    private readonly userRepository;
    private readonly jwtService;
    private readonly userCouponService;
    private readonly resilientService;
    private readonly contentClient;
    private readonly logger;
    constructor(userRepository: Repository<User>, jwtService: JwtService, userCouponService: UserCouponService, resilientService: ResilientService, contentClient: ClientProxy);
    createGuestUser(deviceInfo?: any, email?: string): Promise<{
        data: User;
        guestToken: string;
    }>;
    createBasicUser(email: string): Promise<{
        data: User;
        message: string;
        success: boolean;
        token: string;
    }>;
    validateGuestUser(guestToken: string): Promise<User | null>;
    validateBasicUser(email: string, deviceInfo: any): Promise<{
        data: User | null;
        message: string;
        success: boolean;
        token?: string;
    }>;
    private generateUserToken;
    validateGoogleUser(profile: any): Promise<User>;
    login(user: any): Promise<{
        access_token: any;
        user: {
            id: any;
            email: any;
            name: any;
            provider: any;
            avatar: any;
            esInvitado: any;
            guestToken: any;
        };
    }>;
    loginGuest(guestToken: string): Promise<any>;
    migrateGuestToRegistered(guestToken: string, googleProfile: any): Promise<User>;
    extractTokenFromContext(context: any): Promise<string | null>;
    validateToken(token: string): Promise<any>;
    ultimoInicioSesionUsuario(token: string, email?: string): Promise<void>;
    getUsuarioEtiquetas(usuario_id: number | string): Promise<{
        etiquetas: string[];
    }>;
    getUserByDocument(documento: number): Promise<{
        data: User | null;
        success: boolean;
        message: string;
    }>;
    createUserCoupon(couponData: {
        userId: number;
        idCupon: number;
        descripcion: string;
        eventId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    asignarCuponMasivo(payload: {
        idCupon: number;
        userIds: (number | string)[];
        descripcion?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
}
