import { Body, Controller, Post, Put, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class UserController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Post('listar')
  async getAllUsers(@Body() filters: any) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_all_users' }, { filters })
      );
      return result;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw new Error('Error al obtener usuarios: ' + error.message);
    }
  }

  @Post('search')
  async searchUsers(@Body() data: { filters: any }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'search_users' }, data)
      );
      return result;
    } catch (error) {
      console.error('Error in searchUsers:', error);
      throw new Error('Error al buscar usuarios: ' + error.message);
    }
  }

  @Put()
  async updateUsers(@Body() data: { filters: any; updates: any }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'update_users' }, data)
      );
      return result;
    } catch (error) {
      console.error('Error in updateUsers:', error);
      throw new Error('Error al actualizar usuarios: ' + error.message);
    }
  }
}