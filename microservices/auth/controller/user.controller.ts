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

  // ----------------------------- Perfil (datos personales) -----------------------------
  @MessagePattern({ cmd: 'get_user_profile_db' })
  async getProfile(@Payload() payload: { userId: number }) {
    return this.userService.getProfile(Number(payload?.userId));
  }

  @MessagePattern({ cmd: 'update_user_personal' })
  async updateUserPersonal(@Payload() payload: { userId: number; patch: any }) {
    return this.userService.updateProfile(Number(payload?.userId), payload?.patch || {});
  }

  // ----------------------------- Direcciones -----------------------------
  @MessagePattern({ cmd: 'get_user_addresses' })
  async getUserAddresses(@Payload() payload: { userId: number }) {
    return this.userService.getUserAddresses(Number(payload?.userId));
  }

  @MessagePattern({ cmd: 'add_user_address' })
  async addUserAddress(@Payload() payload: { userId: number; address: any }) {
    return this.userService.addUserAddress(Number(payload?.userId), payload?.address);
  }

  @MessagePattern({ cmd: 'update_user_address' })
  async updateUserAddress(@Payload() payload: { userId: number; addressId: string; patch: any }) {
    return this.userService.updateUserAddress(Number(payload?.userId), payload?.addressId, payload?.patch);
  }

  @MessagePattern({ cmd: 'delete_user_address' })
  async deleteUserAddress(@Payload() payload: { userId: number; addressId: string }) {
    return this.userService.deleteUserAddress(Number(payload?.userId), payload?.addressId);
  }
}