import { Repository } from 'typeorm';
import { UserCoupon } from '../schemas/user-coupon.schema';
export declare class UserCouponService {
    private readonly userCouponRepository;
    private readonly logger;
    constructor(userCouponRepository: Repository<UserCoupon>);
    getUserCoupons(userId: number): Promise<UserCoupon[]>;
    getActiveUserCoupons(userId: number): Promise<UserCoupon[]>;
    getUserCouponsCount(userId: number, idCupon: number): Promise<number>;
    createUserCoupon(couponData: Partial<UserCoupon>): Promise<UserCoupon>;
    validateCoupon(userId: number, couponCode: string): Promise<{
        valid: boolean;
        coupon?: UserCoupon;
        message: string;
    }>;
    getCouponsForToken(userId: number): Promise<string[]>;
    createCouponForUser(userId: number, couponData: {
        idCupon: number;
        descripcion: string;
        eventId?: string;
    }): Promise<UserCoupon | null>;
}
