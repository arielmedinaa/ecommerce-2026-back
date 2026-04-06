import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../service/auth.service';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'create_guest_session' })
  async createGuestSession(
    @Payload() payload: { ipAddress: string; userAgent: string },
  ) {
    const deviceInfo = {
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    };
    try {
      return await this.authService.createGuestUser(deviceInfo);
    } catch (error) {
      this.logger.error('Error in create_guest_session:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_basic_user' })
  async createBasicUser(@Payload() payload: { email: string }) {
    try {
      return await this.authService.createBasicUser(payload.email);
    } catch (error) {
      this.logger.error('Error in create_basic_user:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'validate_google_user' })
  async validateGoogleUser(@Payload() payload: any) {
    try {
      const user = await this.authService.validateGoogleUser(payload);
      return await this.authService.login(user);
    } catch (error) {
      this.logger.error('Error in validate_google_user:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'validate_basic_user' })
  async validateBasicUser(@Payload() payload: { email: string; deviceInfo: any }) {
    try {
      return await this.authService.validateBasicUser(payload.email, payload.deviceInfo);
    } catch (error) {
      this.logger.error('Error in validate_basic_user:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_user_profile' })
  async getUserProfile(@Payload() payload: { token: string }) {
    try {
      if (!payload.token) {
        return { user: null };
      }

      const decoded = await this.authService.validateToken(payload.token);
      if (!decoded) {
        return { user: null };
      }

      return {
        user: {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          provider: decoded.provider,
        },
      };
    } catch (error) {
      this.logger.error('Error in get_user_profile:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'login_user' })
  async loginUser(@Payload() payload: any) {
    try {
      return await this.authService.login(payload);
    } catch (error) {
      this.logger.error('Error in login_user:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'ultimo_inicio_sesion_usuario' })
  async ultimoInicioSesionUsuario(
    @Payload() payload: { token: string; email?: string },
  ) {
    try {
      await this.authService.ultimoInicioSesionUsuario(
        payload.token,
        payload.email,
      );
      return { success: true };
    } catch (error) {
      this.logger.error('Error in ultimo_inicio_sesion_usuario:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'obtener_etiquetas_usuario' })
  async obtenerEtiquetasUsuario(
    @Payload() payload: { usuario_id: number | string },
  ) {
    try {
      return await this.authService.getUsuarioEtiquetas(payload.usuario_id);
    } catch (error) {
      this.logger.error('Error in obtener_etiquetas_usuario:', error);
      throw error;
    }
  }
}
