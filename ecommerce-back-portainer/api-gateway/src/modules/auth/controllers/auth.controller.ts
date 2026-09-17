import { BadRequestException, Body, Controller, Post, Get, Inject, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequireModulo } from '@gateway/common/guards/roles.guard';
import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';

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
  @SneakyThrows('AuthService', 'createGuestSession')
  async createGuestSession(@Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return await firstValueFrom(
      this.authClient.send({ cmd: 'create_guest_session' }, { ipAddress, userAgent })
    );
  }

  @Post('basic')
  @SneakyThrows('AuthService', 'createBasicUser')
  async createBasicUser(@Body() body: { email: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'create_basic_user' }, { email: body.email })
    );
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
  @SneakyThrows('AuthService', 'logout')
  async logout(@Res() res: Response) {
    res.clearCookie('access_token');
    res.json({ message: 'Logged out successfully' });
  }

  @Post('validate-token')
  @SneakyThrows('AuthService', 'validateToken')
  async validateToken(@Body() body: { token: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_profile' }, { token: body.token })
    );
  }

  @Post('validateBasicUser')
  @SneakyThrows('AuthService', 'validateBasicUser')
  async validateBasicUser(
    @Body() body: { email: string; password?: string; acceptedTerms?: boolean },
    @Req() req: Request,
  ) {
    if (!body?.email) {
      throw new BadRequestException('email is required');
    }

    // El login de proveedores requiere contraseña; el resto de los flujos
    // (admins/clientes) no se ven afectados por este chequeo.
    const idProveedor = await this.resolveIdProveedor(body.email);
    if (idProveedor) {
      const passwordCheck: any = await firstValueFrom(
        this.productsClient.send(
          { cmd: 'verify_proveedor_password' },
          { email: body.email, password: body.password },
        ),
      );
      if (!passwordCheck?.success) {
        return { success: false, message: passwordCheck?.message || 'Credenciales inválidas' };
      }
    }

    const deviceInfo = req.headers['user-agent'];
    const payload = { email: body.email, deviceInfo };

    const result = await firstValueFrom(
      this.authClient.send({ cmd: 'validate_basic_user' }, payload)
    );

    if (result?.success && result?.token && idProveedor) {
      // Login de proveedor con contraseña verificada: se registra el ingreso
      // y, si vino marcado, la aceptación de Términos y Condiciones. No
      // bloquea la respuesta del login si esto falla.
      this.productsClient
        .send({ cmd: 'register_proveedor_login' }, { idProveedor, acceptedTerms: !!body.acceptedTerms })
        .subscribe({ error: () => undefined });

      const decoded = this.jwtService.decode(result.token) as Record<string, any>;
      const { exp, iat, ...decodedClaims } = decoded;
      const providerToken = this.jwtService.sign(
        { ...decodedClaims, tipo: 'provider', idProveedor },
        { expiresIn: '24h' },
      );
      return { ...result, token: providerToken };
    }

    return result;
  }

  @Post('ultimo-inicio-sesion')
  @SneakyThrows('AuthService', 'ultimoInicioSesion')
  async ultimoInicioSesion(@Body() body: { token: string; email?: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'ultimo_inicio_sesion_usuario' }, body)
    );
  }

  @Post('asignar-cupon')
  @SneakyThrows('AuthService', 'asignarCupon')
  async asignarCupon(
    @Body() body: { userId: number; idCupon: number; descripcion: string; eventId?: string },
  ) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'createUserCoupon' }, body),
    );
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
  async createProveedor(@Body() body: { nombre: string; email: string; password?: string }) {
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
