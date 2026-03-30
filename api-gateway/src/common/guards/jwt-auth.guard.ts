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
    let request: any;

    if (context.getType() === 'rpc') {
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

    try {
      const payload = this.jwtService.verify(token);
      if (request) {
        request.user = payload;
      } else {
        const ctx = context.switchToRpc().getContext();
        ctx.user = payload;
      }
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromData(data: any): string | undefined {
    if (data?.headers?.authorization) {
      const [type, token] = data.headers.authorization.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
    return undefined;
  }
}
