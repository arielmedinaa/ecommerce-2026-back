import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let token: string | undefined;
    
    if (context.getType() === 'rpc') {
      const data = context.switchToRpc().getData();
      token = this.extractTokenFromData(data);
    } else {
      const request = context.switchToHttp().getRequest();
      token = this.extractTokenFromHeader(request);
    }

    if (!token) {
      throw new UnauthorizedException('No se proporcionó un token de autenticación');
    }

    try {
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        throw new Error('Invalid token format');
      }

      const payload = { token, authenticated: true };
      const ctx = context.switchToRpc().getContext();
      ctx.user = payload;
      
    } catch {
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
