import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../schemas/user.schemas';
import * as crypto from 'crypto';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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
      
      return { token, user: existingGuest };
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
    return { token, user: guestUser };
  }
}
