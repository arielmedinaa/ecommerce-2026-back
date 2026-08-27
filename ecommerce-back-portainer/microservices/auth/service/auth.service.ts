import { User } from '@auth/schemas/user.schemas';
import { Rol } from '@auth/schemas/rol.schema';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserCouponService } from './user-coupon.service';
import { ClientProxy } from '@nestjs/microservices';
import { ResilientService, ResilientOptions } from '@shared/common/decorators/resilient-client.decorator';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Rol) private readonly rolRepository: Repository<Rol>,
    private readonly jwtService: JwtService,
    private readonly userCouponService: UserCouponService,
    private readonly resilientService: ResilientService,
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  async createGuestUser(
    deviceInfo?: any,
    email?: string,
  ): Promise<{ data: User; guestToken: string }> {
    const guestSessionId = crypto.randomBytes(32).toString('hex');
    const guestEmail = email || `guest_${guestSessionId}@temp.ecommerce`;

    const guestUser = this.userRepository.create({
      email: guestEmail,
      nombre: 'Usuario Invitado',
      proveedor: 'guest',
      idProveedor: guestSessionId,
      esInvitado: true,
      infoDispositivo: deviceInfo || {},
      ultimoInicioSesion: new Date(),
      fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      etiquetas: ['NUEVO_USUARIO'],
    });

    await this.userRepository.save(guestUser);
    const jwtToken = await this.generateUserToken(guestUser);
    this.logger.log(`Created new guest user: ${guestUser.id}`);
    return { data: guestUser, guestToken: jwtToken };
  }

  async createBasicUser(
    email: string,
  ): Promise<{ data: User; message: string; success: boolean; token: string }> {
    const user = this.userRepository.create({
      email,
      nombre: email.split('@')[0],
      proveedor: 'usuario basico',
      idProveedor: email,
      esInvitado: false,
      ultimoInicioSesion: new Date(),
      etiquetas: ['NUEVO_USUARIO'],
    });

    await this.userRepository.save(user);
    const token = await this.generateUserToken(user);
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

  async validateBasicUser(
    email: string,
    deviceInfo: any,
  ): Promise<{
    data: User | null;
    message: string;
    success: boolean;
    token?: string;
  }> {
    if (!email) {
      return {
        data: null,
        message: 'email is required',
        success: false,
      };
    }
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      const guestUser = await this.createGuestUser(deviceInfo, email);
      return {
        data: guestUser.data,
        message: 'USUARIO CREADO EXITOSAMENTE',
        success: true,
        token: guestUser.guestToken,
      };
    }

    await this.ultimoInicioSesionUsuario('', email);
    const newToken = await this.generateUserToken(user);
    return {
      data: user,
      message: 'USUARIO ENCONTRADO',
      success: true,
      token: newToken,
    };
  }

  private async generateUserToken(user: User): Promise<string> {
    const userCoupons = await this.userCouponService.getCouponsForToken(
      user.id,
    );
    const payload: Record<string, any> = {
      sub: user.id.toString(),
      email: user.email,
      name: user.nombre,
      provider: user.proveedor,
      etiquetas: user.etiquetas || [],
      cupones: userCoupons,
      perfil: user.perfil || 'cliente',
      numeroCelular: user.numeroCelular || '',
      numeroDocumento: user.numeroDocumento || '',
    };

    if (user.perfil === 'administrador') {
      payload.tipo = 'admin';
      payload.rol = user.rol?.nombre ?? null;
      payload.modulosPermitidos = user.rol?.modulos ?? [];
    }

    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  async createAdminUser(payload: {
    nombre: string;
    email: string;
    rolId: number;
  }): Promise<{ data: User | null; success: boolean; message: string }> {
    const existente = await this.userRepository.findOne({ where: { email: payload.email } });
    if (existente) {
      return { data: null, success: false, message: 'El email ya está registrado' };
    }

    const rol = await this.rolRepository.findOne({ where: { id: payload.rolId } });
    if (!rol) {
      return { data: null, success: false, message: 'El rol indicado no existe' };
    }

    const admin = this.userRepository.create({
      email: payload.email,
      nombre: payload.nombre,
      proveedor: 'usuario basico',
      idProveedor: payload.email,
      esInvitado: false,
      estaActivo: true,
      perfil: 'administrador',
      rolId: rol.id,
      etiquetas: ['ADMINISTRADOR'],
    });

    await this.userRepository.save(admin);
    return { data: admin, success: true, message: 'Administrador creado exitosamente' };
  }

  async listAdminUsers(): Promise<{ data: User[]; success: boolean; message: string }> {
    const data = await this.userRepository.find({
      where: { perfil: 'administrador' },
      order: { fechaCreacion: 'DESC' },
    });
    return { data, success: true, message: 'OK' };
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
        etiquetas: ['GOOGLE_USER'],
      });
    } else {
      user.ultimoInicioSesion = new Date();
    }

    await this.userRepository.save(user);
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

    const googleUser = await this.validateGoogleUser(googleProfile);

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

  async ultimoInicioSesionUsuario(
    token: string,
    email?: string,
  ): Promise<void> {
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

  async getUsuarioEtiquetas(
    usuario_id: number | string,
  ): Promise<{ etiquetas: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: Number(usuario_id) },
      select: { etiquetas: true },
    });
    const etiquetas = user?.etiquetas || [];
    this.logger.log(
      `Etiquetas para usuario ${usuario_id}: ${JSON.stringify(etiquetas)}`,
    );

    return { etiquetas };
  }

  async getUserByDocument(
    documento: number,
  ): Promise<{ data: User | null; success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: documento },
      });

      if (!user) {
        return {
          data: null,
          success: false,
          message: 'Usuario no encontrado',
        };
      }

      return {
        data: user,
        success: true,
        message: 'Usuario encontrado',
      };
    } catch (error) {
      this.logger.error('Error al obtener usuario por documento:', error);
      return {
        data: null,
        success: false,
        message: 'Error al buscar usuario',
      };
    }
  }

  async createUserCoupon(couponData: {
    userId: number;
    idCupon: number;
    descripcion: string;
    eventId?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const resilientOptions: ResilientOptions = {
        retries: 3,
        delay: 1000,
        fallback: async () => {
          this.logger.warn('Using fallback for cupon limit - defaulting to 1');
          return 1;
        },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 30000,
        },
      };

      try {
        const cuponRes = await this.resilientService.sendWithResilience(
          this.contentClient,
          { cmd: 'obtener_cupon_por_id' },
          { id: couponData.idCupon },
          { retries: 2, delay: 800, fallback: async () => null, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } },
        ) as any;
        const cupon = cuponRes?.data;
        if (cupon && cupon.vigente === false) {
          return {
            success: false,
            message: 'EL CUPÓN ESTÁ VENCIDO O INACTIVO Y NO PUEDE ASIGNARSE',
          };
        }
      } catch (e) {
        this.logger.warn('No se pudo verificar vigencia del cupón, se continúa', e);
      }

      const limitePorUsuarioCupon = await this.resilientService.sendWithResilience(
        this.contentClient,
        { cmd: 'listarCuponId' },
        { idCupon: couponData.idCupon },
        resilientOptions,
      ) as number;

      const limiteRaw = Number(limitePorUsuarioCupon);
      const limite = Number.isFinite(limiteRaw) ? limiteRaw : 1;
      if (limite > 0) {
        const cantidadCuponesUsuario =
          await this.userCouponService.getUserCouponsCount(
            couponData.userId,
            couponData.idCupon,
          );
        if (cantidadCuponesUsuario >= limite) {
          return {
            success: false,
            message: 'USUARIO YA TIENE EL MÁXIMO DE ESTE CUPÓN',
          };
        }
      }
      const coupon = await this.userCouponService.createCouponForUser(
        couponData.userId,
        {
          idCupon: couponData.idCupon,
          descripcion: couponData.descripcion,
          eventId: couponData.eventId,
        },
      );

      if (!coupon) {
        return {
          success: false,
          message: 'USUARIO YA TIENE ESTE CUPÓN',
        };
      }

      return {
        success: true,
        message: 'Cupón creado exitosamente'.toUpperCase(),
        data: coupon,
      };
    } catch (error) {
      this.logger.error('Error al crear cupón de usuario:', error);
      return {
        success: false,
        message: 'Error al crear cupón',
      };
    }
  }

  async asignarCuponMasivo(payload: {
    idCupon: number;
    userIds: (number | string)[];
    descripcion?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    const idCupon = Number(payload?.idCupon);
    const userIds = (Array.isArray(payload?.userIds) ? payload.userIds : [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (!idCupon || userIds.length === 0) {
      return { success: false, message: 'FALTAN idCupon O userIds' };
    }

    try {
      const cuponRes = (await this.resilientService.sendWithResilience(
        this.contentClient,
        { cmd: 'obtener_cupon_por_id' },
        { id: idCupon },
        { retries: 2, delay: 800, fallback: async () => null, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } },
      )) as any;
      if (cuponRes?.data && cuponRes.data.vigente === false) {
        return { success: false, message: 'EL CUPÓN ESTÁ VENCIDO O INACTIVO Y NO PUEDE ASIGNARSE' };
      }
    } catch (e) {
      this.logger.warn('No se pudo verificar vigencia del cupón (masivo), se continúa', e);
    }

    let limite = 0;
    try {
      limite = (await this.resilientService.sendWithResilience(
        this.contentClient,
        { cmd: 'listarCuponId' },
        { idCupon },
        { retries: 2, delay: 800, fallback: async () => 0, circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 } },
      )) as number;
    } catch {
      limite = 0;
    }

    const asignados: number[] = [];
    const omitidos: Array<{ userId: number; motivo: string }> = [];

    const limiteNorm = Number.isFinite(limite) ? limite : 1;
    for (const uid of userIds) {
      try {
        if (limiteNorm > 0) {
          const count = await this.userCouponService.getUserCouponsCount(uid, idCupon);
          if (count >= limiteNorm) {
            omitidos.push({ userId: uid, motivo: 'ya tiene el máximo del cupón' });
            continue;
          }
        }
        const created = await this.userCouponService.createCouponForUser(uid, {
          idCupon,
          descripcion: payload?.descripcion || 'Asignación masiva',
        });
        if (created) asignados.push(uid);
        else omitidos.push({ userId: uid, motivo: 'ya tiene el cupón' });
      } catch (e) {
        this.logger.error(`Error asignando cupón ${idCupon} al usuario ${uid}`, e);
        omitidos.push({ userId: uid, motivo: 'error' });
      }
    }

    return {
      success: true,
      message: `Asignados ${asignados.length}, omitidos ${omitidos.length}`,
      data: { asignados, omitidos },
    };
  }
}
