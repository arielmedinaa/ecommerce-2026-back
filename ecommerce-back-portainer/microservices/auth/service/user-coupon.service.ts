import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCoupon } from '../schemas/user-coupon.schema';
import { User } from '../schemas/user.schemas';

@Injectable()
export class UserCouponService {
  private readonly logger = new Logger(UserCouponService.name);

  constructor(
    @InjectRepository(UserCoupon)
    private readonly userCouponRepository: Repository<UserCoupon>,
  ) {}

  async getUserCoupons(userId: number): Promise<UserCoupon[]> {
    try {
      return await this.userCouponRepository.find({
        where: { 
          userId: { id: userId },
          isActive: true 
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error al obtener cupones del usuario', error);
      return [];
    }
  }

  async getActiveUserCoupons(userId: number): Promise<UserCoupon[]> {
    try {
      return await this.userCouponRepository.find({
        where: { 
          userId: { id: userId },
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error al obtener cupones activos del usuario', error);
      return [];
    }
  }

  async getUserCouponsCount(userId: number, idCupon: number): Promise<number> {
    try {
      return await this.userCouponRepository.count({
        where: { 
          userId: { id: userId },
          idCupon: idCupon,
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error('Error al obtener cantidad de cupones del usuario', error);
      return 0;
    }
  }

  async createUserCoupon(couponData: Partial<UserCoupon>): Promise<UserCoupon> {
    try {
      const newCoupon = this.userCouponRepository.create(couponData);
      return await this.userCouponRepository.save(newCoupon);
    } catch (error) {
      this.logger.error('Error al crear cupón de usuario', error);
      throw error;
    }
  }

  async validateCoupon(userId: number, couponCode: string): Promise<{ valid: boolean; coupon?: UserCoupon; message: string }> {
    try {
      const coupon = await this.userCouponRepository.findOne({
        where: {
          userId: { id: userId },
          idCupon: parseInt(couponCode),
          isActive: true,
        },
      });

      if (!coupon) {
        return { valid: false, message: 'Cupón no encontrado o no válido' };
      }

      return { valid: true, coupon, message: 'Cupón válido' };
    } catch (error) {
      this.logger.error('Error al validar cupón', error);
      return { valid: false, message: 'Error al validar cupón' };
    }
  }

  async getCouponsForToken(userId: number): Promise<string[]> {
    try {
      const activeCoupons = await this.getActiveUserCoupons(userId);
      return activeCoupons.map(coupon => coupon.idCupon.toString());
    } catch (error) {
      this.logger.error('Error al obtener cupones para token', error);
      return [];
    }
  }

  async createCouponForUser(userId: number, couponData: { idCupon: number; descripcion: string; eventId?: string }): Promise<UserCoupon> {
    try {
      const user = { id: userId } as User;
      
      const newCoupon = this.userCouponRepository.create({
        userId: user,
        idCupon: couponData.idCupon,
        descripcion: couponData.descripcion,
        eventId: couponData.eventId,
        isActive: true,
      });

      return await this.userCouponRepository.save(newCoupon);
    } catch (error) {
      this.logger.error('Error al crear cupón para usuario', error);
      throw error;
    }
  }
}
