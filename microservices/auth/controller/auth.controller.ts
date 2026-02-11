import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../service/auth.service';
import { GuestService } from '../service/guest.service';

interface AuthenticatedRequest {
  user?: any;
}

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly guestService: GuestService,
  ) {}

  @MessagePattern({ cmd: 'create_guest_session' })
  async createGuestSession(@Payload() payload: { ipAddress: string; userAgent: string }) {
    try {
      const result = await this.guestService.createGuestToken(payload.ipAddress, payload.userAgent);

      return {
        access_token: result.token,
        user: {
          id: result.user._id,
          email: result.user.email,
          name: result.user.name,
          provider: result.user.provider,
        },
      };
    } catch (error) {
      this.logger.error('Error in create_guest_session:', error);
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

  @MessagePattern({ cmd: 'validate_guest_token' })
  async validateGuestToken(@Payload() payload: { token: string; ipAddress: string }) {
    try {
      return await this.guestService.validateGuestToken(payload.token, payload.ipAddress);
    } catch (error) {
      this.logger.error('Error in validate_guest_token:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'revoke_guest_token' })
  async revokeGuestToken(@Payload() payload: { token: string }) {
    try {
      await this.guestService.revokeGuestToken(payload.token);
      return { success: true };
    } catch (error) {
      this.logger.error('Error in revoke_guest_token:', error);
      throw error;
    }
  }
}
