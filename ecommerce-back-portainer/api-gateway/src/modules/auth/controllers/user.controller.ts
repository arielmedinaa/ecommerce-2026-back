import { Body, Controller, Get, Param, Post, Put, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class UserController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  // Estado de un email: si existe (en otra cuenta) y si tuvo movimientos (carritos) en 30d.
  @Get('email-status')
  async emailStatus(@Query('email') email: string, @Query('excludeUserId') excludeUserId?: string) {
    const found: any = await firstValueFrom(
      this.authClient.send(
        { cmd: 'find_user_by_email' },
        { email, excludeUserId: excludeUserId ? Number(excludeUserId) : undefined },
      ),
    );
    if (!found?.exists) return { exists: false };
    const mov: any = await firstValueFrom(
      this.cartClient.send({ cmd: 'user_has_movements' }, { userId: found.userId }),
    );
    return { exists: true, userId: found.userId, nombre: found.nombre, hasMovements: !!mov?.hasMovements };
  }

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

  // Listado de clientes para el admin: paginado + búsqueda + filtros.
  @Get('clientes')
  async listClientes(@Query() query: any) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'list_clientes' }, query || {}),
    );
  }

  @Get('clientes/stats')
  async clientesStats() {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_clientes_stats' }, {}),
    );
  }

  // Todos los ids de clientes que cumplen los filtros (para "seleccionar todos").
  @Get('clientes/ids')
  async clientesIds(@Query() query: any) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'list_cliente_ids' }, query || {}),
    );
  }

  @Get(':id/cupones')
  async userCoupons(@Param('id') id: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_coupons' }, { userId: Number(id) }),
    );
  }

  @Post('mensaje-masivo')
  async mensajeMasivo(@Body() body: { userIds: (number | string)[]; mensaje: string; bannerUrl?: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'send_mass_message' }, body),
    );
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