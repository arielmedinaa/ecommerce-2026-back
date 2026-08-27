import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export const REQUIRE_MODULO_KEY = 'requireModulo';
export const RequireModulo = (modulo: string) =>
  SetMetadata(REQUIRE_MODULO_KEY, modulo);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const modulo = this.reflector.getAllAndOverride<string>(
      REQUIRE_MODULO_KEY,
      [context.getHandler(), context.getClass()],
    );

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

    if (payload.tipo !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden acceder a este recurso');
    }

    if (modulo && payload.rol !== 'super_admin' && !payload.modulosPermitidos?.includes(modulo)) {
      throw new ForbiddenException(`No tenés acceso al módulo '${modulo}'`);
    }

    (request as any).user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
