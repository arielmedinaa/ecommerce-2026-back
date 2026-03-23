import { User } from '@auth/schemas/user.schemas';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createGuestUser(deviceInfo?: any): Promise<User> {
    const guestToken = this.generateGuestToken();
    this.logger.log(`Generated guest token: ${guestToken}`);
    const guestEmail = `guest_${guestToken}@temp.ecommerce`;

    const guestUser = this.userRepository.create({
      email: guestEmail,
      nombre: 'Usuario Invitado',
      proveedor: 'guest',
      idProveedor: guestToken,
      esInvitado: true,
      infoDispositivo: deviceInfo || {},
      ultimoInicioSesion: new Date(),
      fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.userRepository.save(guestUser);
    this.logger.log(`Created new guest user: ${guestToken}`);
    return guestUser;
  }

  async createBasicUser(email: string): Promise<{data: User; message: string; success: boolean; token: string}> {
    const user = this.userRepository.create({
      email,
      nombre: email.split('@')[0],
      proveedor: 'usuario basico',
      idProveedor: email,
      esInvitado: false,
      ultimoInicioSesion: new Date(),
    });

    await this.userRepository.save(user);
    this.logger.log(`Created new basic user: ${email}`);
    
    const token = this.generateUserToken(user);
    
    return {
      data: user,
      message: 'USUARIO CREADO EXITOSAMENTE',
      success: true,
      token,
    };
  }

  async validateGuestUser(guestToken: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        idProveedor: guestToken,
        proveedor: 'guest',
        esInvitado: true,
      },
    });

    if (user && user.fechaExpiracion && user.fechaExpiracion < new Date()) {
      return null;
    }

    return user;
  }

  private generateGuestToken(): string {
    const payload = {
      sub: 'guest',
      email: `guest_${Date.now()}@temp.ecommerce`,
      name: 'Usuario Invitado',
      provider: 'guest',
    };
    
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private generateUserToken(user: User): string {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.nombre,
      provider: user.proveedor,
    };
    
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  async validateGoogleUser(profile: any): Promise<User> {
    const { idProveedor, email, nombre, avatar } = profile;

    let user = await this.userRepository.findOne({
      where: { idProveedor, proveedor: 'google' },
    });

    if (!user) {
      user = this.userRepository.create({
        email,
        nombre,
        avatar,
        proveedor: 'google',
        idProveedor,
        ultimoInicioSesion: new Date(),
      });
      await this.userRepository.save(user);
      this.logger.log(`Created new Google user: ${email}`);
    } else {
      user.ultimoInicioSesion = new Date();
      await this.userRepository.save(user);
    }

    return user;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.proveedor,
      name: user.nombre,
      esInvitado: user.esInvitado || false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.nombre,
        provider: user.proveedor,
        avatar: user.avatar,
        esInvitado: user.esInvitado || false,
        guestToken: user.esInvitado ? user.idProveedor : null,
      },
    };
  }

  async loginGuest(guestToken: string): Promise<any> {
    const user = await this.validateGuestUser(guestToken);
    if (!user) {
      throw new Error('Guest token expired or invalid');
    }

    return this.login(user);
  }

  async migrateGuestToRegistered(
    guestToken: string,
    googleProfile: any,
  ): Promise<User> {
    const guestUser = await this.validateGuestUser(guestToken);
    if (!guestUser) {
      throw new Error('Guest token expired or invalid');
    }

    // Crear usuario Google
    const googleUser = await this.validateGoogleUser(googleProfile);

    // Migrar carritos del guest al Google user (actualizar cliente.equipo)
    // Esto se haría en el servicio de cart

    // Eliminar usuario invitado
    await this.userRepository.delete(guestUser.id);

    this.logger.log(
      `Migrated guest ${guestToken} to Google user ${googleUser.email}`,
    );
    return googleUser;
  }

  async extractTokenFromContext(context: any): Promise<string | null> {
    const request =
      context.getArgByIndex(1)?.req || context.switchToHttp()?.getRequest();

    if (!request?.headers?.authorization) {
      this.logger.warn('No authorization header found');
      return null;
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }

  async ultimoInicioSesionUsuario(token: string, email?: string): Promise<void> {
    if (!email) {
      await this.userRepository.update(`guest_${token}`, {
        ultimoInicioSesion: new Date(),
      });
    } else {
      await this.userRepository.update(email, {
        ultimoInicioSesion: new Date(),
      });
    }
  }
}
