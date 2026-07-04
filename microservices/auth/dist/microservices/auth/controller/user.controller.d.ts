import { UserService } from '../service/user.service';
import { UserCouponService } from '../service/user-coupon.service';
import { ErpClienteService } from '../service/erp-cliente.service';
import { UserTrackService, TrackEventInput } from '../service/user-track.service';
export declare class UserController {
    private readonly userService;
    private readonly userCouponService;
    private readonly erpClienteService;
    private readonly userTrackService;
    constructor(userService: UserService, userCouponService: UserCouponService, erpClienteService: ErpClienteService, userTrackService: UserTrackService);
    getClienteErp(payload: {
        documento: string;
    }): Promise<import("../service/erp-cliente.service").ErpClienteDto>;
    getCargosRubros(): Promise<import("../service/erp-cliente.service").ErpCatalogos>;
    getAllUsers(data: {
        filters: any;
    }): Promise<{
        data: any[];
        total: number;
        message: string;
        success: boolean;
        prefetch: any;
    }>;
    searchUsers(data: {
        filters: any;
    }): Promise<{
        data: any[];
        total: number;
        message: string;
        success: boolean;
    }>;
    listClientes(params: any): Promise<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
        message: string;
        success: boolean;
    }>;
    getClientesStats(): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    listClienteIds(params: any): Promise<{
        data: number[];
        total: number;
        success: boolean;
        message: string;
    }>;
    getUserCoupons(payload: {
        userId: number;
    }): Promise<{
        data: import("../schemas/user-coupon.schema").UserCoupon[];
        success: boolean;
        message: string;
    }>;
    sendMassMessage(payload: {
        userIds: (number | string)[];
        mensaje: string;
        bannerUrl?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    findUserByEmail(payload: {
        email: string;
        excludeUserId?: number;
    }): Promise<{
        exists: boolean;
        userId?: undefined;
        nombre?: undefined;
    } | {
        exists: boolean;
        userId: any;
        nombre: any;
    }>;
    sendEmailCode(payload: {
        email: string;
    }): Promise<{
        success: boolean;
        message: string;
        devCode?: undefined;
    } | {
        success: boolean;
        message: string;
        devCode: string;
    }>;
    verifyEmailCode(payload: {
        email: string;
        code: string;
    }): Promise<{
        valid: boolean;
        message: string;
    }>;
    updateUsers(data: {
        filters: any;
        updates: any;
    }): Promise<{
        data: any;
        total: number;
        message: string;
        success: boolean;
    }>;
    getProfile(payload: {
        userId: number;
    }): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    updateUserPersonal(payload: {
        userId: number;
        patch: any;
    }): Promise<{
        data: any;
        success: boolean;
        message: string;
    }>;
    getUserAddresses(payload: {
        userId: number;
    }): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    addUserAddress(payload: {
        userId: number;
        address: any;
    }): Promise<{
        data: any[];
        nueva?: any;
        success: boolean;
        message: string;
    }>;
    updateUserAddress(payload: {
        userId: number;
        addressId: string;
        patch: any;
    }): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    deleteUserAddress(payload: {
        userId: number;
        addressId: string;
    }): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    handleTrackEvent(payload: TrackEventInput | TrackEventInput[]): void;
    getUserTrack(payload: {
        userId: string;
    }): Promise<any>;
}
