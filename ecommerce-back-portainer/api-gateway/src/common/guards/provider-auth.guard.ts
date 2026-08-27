import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class ProviderAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'No se proporcionó un token de autenticación',
      );
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'default-secret',
      });
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (payload.tipo !== 'provider') {
      throw new ForbiddenException(
        'Solo proveedores pueden acceder a este recurso',
      );
    }

    (request as any).user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
