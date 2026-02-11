import { Body, Controller, Post, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Inicia el flujo de Google OAuth
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
}
