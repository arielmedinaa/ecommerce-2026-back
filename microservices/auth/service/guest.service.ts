import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../schemas/user.schemas';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GuestService {
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
      
      const payload = {
        sub: existingGuest.id.toString(),
        email: existingGuest.email,
        name: existingGuest.nombre,
        provider: existingGuest.proveedor,
        etiquetas: existingGuest.etiquetas || [],
        cupones: [],
        perfil: existingGuest.perfil || "cliente",
        numeroCelular: existingGuest.numeroCelular || "",
        numeroDocumento: existingGuest.numeroDocumento || ""
      };
      const jwtToken = this.jwtService.sign(payload, { expiresIn: '7d' });
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

    const payload = {
      sub: guestUser.id.toString(),
      email: guestUser.email,
      name: guestUser.nombre,
      provider: guestUser.proveedor,
      etiquetas: guestUser.etiquetas || [],
      cupones: [],
      perfil: guestUser.perfil || "cliente",
      numeroCelular: guestUser.numeroCelular || "",
      numeroDocumento: guestUser.numeroDocumento || ""
    };

    await this.userRepository.save(guestUser);
    const jwtToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { token: jwtToken, user: guestUser };
  }
}
