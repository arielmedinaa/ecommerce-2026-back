import { BadRequestException, Body, Controller, Post, Get, Inject, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequireModulo } from '@gateway/common/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveIdProveedor(email?: string): Promise<number | null> {
    if (!email) return null;
    const result: any = await firstValueFrom(
      this.productsClient.send({ cmd: 'resolve_proveedor_by_email' }, { email }),
    );
    return result?.data?.idProveedor ?? null;
  }

  @Post('guest')
  async createGuestSession(@Req() req: Request) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'create_guest_session' }, { ipAddress, userAgent })
      );

      return result;
    } catch (error) {
      console.error('Error in createGuestSession:', error);
      throw new Error('Error al crear sesión de invitado: ' + error.message);
    }
  }

  @Post('basic')
  async createBasicUser(@Body() body: { email: string }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'create_basic_user' }, { email: body.email })
      );

      return result;
    } catch (error) {
      console.error('Error in createBasicUser:', error);
      throw new Error('Error al crear usuario básico: ' + error.message);
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = (req as any).user;
      
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'validate_google_user' }, user)
      );

      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/success?user=${encodeURIComponent(JSON.stringify(result.user))}`);
    } catch (error) {
      console.error('Error in googleAuthCallback:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/error`);
    }
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    try {
      const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return { user: null };
      }

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_profile' }, { token })
      );

      return result;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return { user: null };
    }
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    try {
      res.clearCookie('access_token');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error in logout:', error);
      throw new Error('Error al cerrar sesión: ' + error.message);
    }
  }

  @Post('validate-token')
  async validateToken(@Body() body: { token: string }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_profile' }, { token: body.token })
      );

      return result;
    } catch (error) {
      console.error('Error in validateToken:', error);
      throw new Error('Error al validar token: ' + error.message);
    }
  }

  @Post('validateBasicUser')
  async validateBasicUser(@Body() body: { email: string }, @Req() req: Request) {
    if (!body?.email) {
      throw new BadRequestException('email is required');
    }
    const deviceInfo = req.headers['user-agent'];
    const payload = { ...body, deviceInfo };
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'validate_basic_user' }, payload)
      );

      if (result?.success && result?.token) {
        const idProveedor = await this.resolveIdProveedor(body.email);
        if (idProveedor) {
          const decoded = this.jwtService.decode(result.token) as Record<string, any>;
          const { exp, iat, ...decodedClaims } = decoded;
          const providerToken = this.jwtService.sign(
            { ...decodedClaims, tipo: 'provider', idProveedor },
            { expiresIn: '24h' },
          );
          return { ...result, token: providerToken };
        }
      }

      return result;
    } catch (error) {
      console.error('Error in validateBasicUser:', error);
      throw new Error('Error al validar usuario básico: ' + error.message);
    }
  }

  @Post('ultimo-inicio-sesion')
  async ultimoInicioSesion(@Body() body: { token: string; email?: string }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'ultimo_inicio_sesion_usuario' }, body)
      );

      return result;
    } catch (error) {
      console.error('Error in ultimoInicioSesion:', error);
      throw new Error('Error al actualizar último inicio de sesión: ' + error.message);
    }
  }

  @Post('asignar-cupon')
  async asignarCupon(
    @Body() body: { userId: number; idCupon: number; descripcion: string; eventId?: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'createUserCoupon' }, body),
      );
      return result;
    } catch (error) {
      console.error('Error in asignarCupon:', error);
      throw new Error('Error al asignar el cupón al cliente: ' + error.message);
    }
  }

  @Post('asignar-cupon-masivo')
  async asignarCuponMasivo(
    @Body() body: { idCupon: number; userIds: (number | string)[]; descripcion?: string },
  ) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'createUserCouponBulk' }, body),
    );
  }

  @Post('email-code')
  async sendEmailCode(@Body() body: { email: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'send_email_code' }, { email: body?.email }),
    );
  }

  @Post('email-code/verify')
  async verifyEmailCode(@Body() body: { email: string; code: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'verify_email_code' }, { email: body?.email, code: body?.code }),
    );
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Post('admins')
  async createAdminUser(@Body() body: { nombre: string; email: string; rolId: number }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'create_admin_user' }, body),
    );
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Get('admins')
  async listAdmins() {
    return await firstValueFrom(this.authClient.send({ cmd: 'list_admin_users' }, {}));
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Get('roles')
  async listRoles() {
    return await firstValueFrom(this.authClient.send({ cmd: 'list_roles' }, {}));
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Post('roles')
  async createRol(@Body() body: { nombre: string; descripcion?: string; modulos: string[] }) {
    return await firstValueFrom(this.authClient.send({ cmd: 'create_rol' }, body));
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Post('roles/:id')
  async updateRol(
    @Param('id') id: string,
    @Body() body: { descripcion?: string; modulos?: string[] },
  ) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'update_rol' }, { id: Number(id), ...body }),
    );
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Post('proveedores')
  async createProveedor(@Body() body: { nombre: string; email: string }) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'create_proveedor' }, body),
    );
  }

  @UseGuards(RolesGuard)
  @RequireModulo('panel')
  @Get('proveedores')
  async listProveedores() {
    return await firstValueFrom(this.productsClient.send({ cmd: 'list_proveedores' }, {}));
  }
}
