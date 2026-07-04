import { User } from '@auth/schemas/user.schemas';
import { Repository } from 'typeorm';
export declare class UserService {
    private readonly userRepository;
    private readonly logger;
    private emailCodes;
    constructor(userRepository: Repository<User>);
    findUserByEmail(email: string, excludeUserId?: number): Promise<{
        exists: boolean;
        userId?: undefined;
        nombre?: undefined;
    } | {
        exists: boolean;
        userId: any;
        nombre: any;
    }>;
    sendEmailCode(email: string): Promise<{
        success: boolean;
        message: string;
        devCode?: undefined;
    } | {
        success: boolean;
        message: string;
        devCode: string;
    }>;
    verifyEmailCode(email: string, code: string): {
        valid: boolean;
        message: string;
    };
    getAllUsers(filters: any): Promise<{
        data: any[];
        total: number;
        message: string;
        success: boolean;
        prefetch: any;
    }>;
    searchUsers(filters: any): Promise<{
        data: any[];
        total: number;
        message: string;
        success: boolean;
    }>;
    listClientes(params?: any): Promise<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
        message: string;
        success: boolean;
    }>;
    private construirQueryClientes;
    listClienteIds(params?: any): Promise<{
        data: number[];
        total: number;
        success: boolean;
        message: string;
    }>;
    getClientesStats(): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    enviarMensajeMasivo(payload: {
        userIds: (number | string)[];
        mensaje: string;
        bannerUrl?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    getProfile(userId: number): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    updateProfile(userId: number, patch: {
        nombre?: string;
        numeroCelular?: string;
        numeroDocumento?: string;
        email?: string;
        parentescos?: string;
    }): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    private genDireccionId;
    private normalizarDireccion;
    getUserAddresses(userId: number): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    addUserAddress(userId: number, address: any): Promise<{
        data: any[];
        nueva?: any;
        success: boolean;
        message: string;
    }>;
    updateUserAddress(userId: number, addressId: string, patch: any): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    deleteUserAddress(userId: number, addressId: string): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    updateUsers(filters: any, updates: any): Promise<{
        data: any;
        total: number;
        message: string;
        success: boolean;
    }>;
}
