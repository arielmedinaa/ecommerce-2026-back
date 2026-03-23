import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../schemas/user.schemas';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createGuestToken(ipAddress: string, userAgent: string): Promise<{ token: string; user: any }> {
    const token = crypto.randomBytes(32).toString('hex');

    const existingGuest = await this.userRepository.findOne({
      where: {
        proveedor: 'guest',
        idProveedor: token,
        esInvitado: true,
      },
    });

    if (existingGuest) {
      existingGuest.ultimoInicioSesion = new Date();
      await this.userRepository.save(existingGuest);
      
      const jwtToken = this.jwtService.sign({ sub: existingGuest.id });
      return { token: jwtToken, user: existingGuest };
    }

    const guestUser = this.userRepository.create({
      email: `guest_${token}@temp.ecommerce`,
      nombre: 'Usuario Invitado',
      proveedor: 'guest',
      idProveedor: token,
      esInvitado: true,
      infoDispositivo: { ipAddress, userAgent },
      ultimoInicioSesion: new Date(),
      fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    });

    await this.userRepository.save(guestUser);
    const jwtToken = this.jwtService.sign({ sub: guestUser.id });
    return { token: jwtToken, user: guestUser };
  }
}
