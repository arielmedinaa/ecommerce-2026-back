import { Body, Controller, Get, Param, Post, Put, Delete, Query, Inject, Req, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

@Controller('users')
export class UserController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
  ) {}

  // Resuelve el id del usuario autenticado a partir del JWT (cookie o Authorization),
  // reutilizando el mismo cmd que /auth/me. Lanza 401 si no hay token válido.
  private async resolverUserId(req: Request): Promise<number> {
    const token =
      (req as any).cookies?.access_token ||
      req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('NO AUTENTICADO');
    const perfil: any = await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_profile' }, { token }),
    );
    const id = Number(perfil?.user?.id);
    if (!Number.isFinite(id)) throw new UnauthorizedException('TOKEN INVÁLIDO');
    return id;
  }

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

  // ----------------------------- Perfil (datos personales) del usuario autenticado -----------------------------
  @Get('me/perfil')
  async getMiPerfil(@Req() req: Request) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_profile_db' }, { userId }),
    );
  }

  @Put('me/perfil')
  async updateMiPerfil(@Req() req: Request, @Body() patch: { nombre?: string; numeroCelular?: string; numeroDocumento?: string }) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'update_user_personal' }, { userId, patch }),
    );
  }

  // ----------------------------- Direcciones del usuario autenticado -----------------------------
  // El userId SIEMPRE se resuelve del token (no se confía en un id del cliente).
  @Get('me/direcciones')
  async getMisDirecciones(@Req() req: Request) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_addresses' }, { userId }),
    );
  }

  @Post('me/direcciones')
  async addMiDireccion(@Req() req: Request, @Body() address: any) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'add_user_address' }, { userId, address }),
    );
  }

  @Put('me/direcciones/:addressId')
  async updateMiDireccion(@Req() req: Request, @Param('addressId') addressId: string, @Body() patch: any) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'update_user_address' }, { userId, addressId, patch }),
    );
  }

  @Delete('me/direcciones/:addressId')
  async deleteMiDireccion(@Req() req: Request, @Param('addressId') addressId: string) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'delete_user_address' }, { userId, addressId }),
    );
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