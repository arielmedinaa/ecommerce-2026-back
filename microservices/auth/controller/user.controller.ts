import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '../service/user.service';
import { UserCouponService } from '../service/user-coupon.service';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userCouponService: UserCouponService,
  ) {}

  @MessagePattern({ cmd: 'get_all_users' })
  async getAllUsers(data: { filters: any }) {
    return this.userService.getAllUsers(data.filters);
  }

  @MessagePattern({ cmd: 'search_users' })
  async searchUsers(data: { filters: any }) {
    return this.userService.searchUsers(data.filters);
  }

  @MessagePattern({ cmd: 'list_clientes' })
  async listClientes(@Payload() params: any) {
    return this.userService.listClientes(params || {});
  }

  @MessagePattern({ cmd: 'get_clientes_stats' })
  async getClientesStats() {
    return this.userService.getClientesStats();
  }

  @MessagePattern({ cmd: 'list_cliente_ids' })
  async listClienteIds(@Payload() params: any) {
    return this.userService.listClienteIds(params || {});
  }

  @MessagePattern({ cmd: 'get_user_coupons' })
  async getUserCoupons(@Payload() payload: { userId: number }) {
    const cupones = await this.userCouponService.getUserCoupons(Number(payload?.userId));
    return { data: cupones, success: true, message: 'CUPONES DEL USUARIO' };
  }

  @MessagePattern({ cmd: 'send_mass_message' })
  async sendMassMessage(@Payload() payload: { userIds: (number | string)[]; mensaje: string; bannerUrl?: string }) {
    return this.userService.enviarMensajeMasivo(payload);
  }

  @MessagePattern({ cmd: 'find_user_by_email' })
  async findUserByEmail(@Payload() payload: { email: string; excludeUserId?: number }) {
    return this.userService.findUserByEmail(payload?.email, payload?.excludeUserId);
  }

  @MessagePattern({ cmd: 'send_email_code' })
  async sendEmailCode(@Payload() payload: { email: string }) {
    return this.userService.sendEmailCode(payload?.email);
  }

  @MessagePattern({ cmd: 'verify_email_code' })
  async verifyEmailCode(@Payload() payload: { email: string; code: string }) {
    return this.userService.verifyEmailCode(payload?.email, payload?.code);
  }

  @MessagePattern({ cmd: 'update_users' })
  async updateUsers(data: { filters: any; updates: any }) {
    return this.userService.updateUsers(data.filters, data.updates);
  }
}