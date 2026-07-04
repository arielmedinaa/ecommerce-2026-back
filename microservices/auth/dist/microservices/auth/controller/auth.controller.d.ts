import { AuthService } from '../service/auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    createGuestSession(payload: {
        ipAddress: string;
        userAgent: string;
    }): Promise<{
        data: import("../schemas/user.schemas").User;
        guestToken: string;
    }>;
    createBasicUser(payload: {
        email: string;
    }): Promise<{
        data: import("../schemas/user.schemas").User;
        message: string;
        success: boolean;
        token: string;
    }>;
    validateGoogleUser(payload: any): Promise<{
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
    validateBasicUser(payload: {
        email: string;
        deviceInfo: any;
    }): Promise<{
        data: import("../schemas/user.schemas").User | null;
        message: string;
        success: boolean;
        token?: string;
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
    ultimoInicioSesionUsuario(payload: {
        token: string;
        email?: string;
    }): Promise<{
        success: boolean;
    }>;
    obtenerEtiquetasUsuario(payload: {
        usuario_id: number | string;
    }): Promise<{
        etiquetas: string[];
    }>;
    getUserByDocument(payload: {
        documento: number;
    }): Promise<{
        data: import("../schemas/user.schemas").User | null;
        success: boolean;
        message: string;
    }>;
    createUserCoupon(payload: any): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    createUserCouponBulk(payload: any): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
}
