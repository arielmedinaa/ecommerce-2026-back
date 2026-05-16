import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from '../service/user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'get_all_users' })
  async getAllUsers(data: { filters: any }) {
    return this.userService.getAllUsers(data.filters);
  }

  @MessagePattern({ cmd: 'search_users' })
  async searchUsers(data: { filters: any }) {
    return this.userService.searchUsers(data.filters);
  }

  @MessagePattern({ cmd: 'update_users' })
  async updateUsers(data: { filters: any; updates: any }) {
    return this.userService.updateUsers(data.filters, data.updates);
  }
}