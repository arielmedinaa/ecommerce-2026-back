import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let token: string | undefined;
    let isRpc = context.getType() === 'rpc';
    let request: any;

    try {
      if (isRpc) {
        const data = context.switchToRpc().getData();
        token = this.extractTokenFromData(data);
      } else {
        request = context.switchToHttp().getRequest();
        token = this.extractTokenFromHeader(request);
      }

      if (!token) {
        throw new UnauthorizedException(
          'No se proporcionó un token de autenticación',
        );
      }

      const payload = this.jwtService.decode(token) || {};

      if (isRpc) {
        const ctx = context.switchToRpc().getContext();
        ctx.user = payload;
      } else {
        const request = context.switchToHttp().getRequest();
        request.user = payload;
      }

      return true;
    } catch (error) {
      console.error('Error en JwtAuthGuard:', error);
      if (isRpc) {
        const ctx = context.switchToRpc().getContext();
        ctx.user = {};
      } else {
        const request = context.switchToHttp().getRequest();
        request.user = {};
      }
      return true;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    if (!request.headers) {
      return undefined;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }
    return token;
  }

  private extractTokenFromData(data: any): string | undefined {
    if (!data) return undefined;

    if (data.token) return data.token;

    if (data.headers?.authorization) {
      const [type, token] = data.headers.authorization.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }

    return undefined;
  }
}
