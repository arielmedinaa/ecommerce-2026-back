import { User } from './user.schemas';
export declare class UserCoupon {
    id: number;
    userId: User;
    idCupon: number;
    descripcion: string;
    eventId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
