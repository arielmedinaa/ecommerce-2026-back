import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../schemas/rol.schema';

const TODOS_LOS_MODULOS = [
  'dashboard',
  'productos',
  'landings',
  'verticales',
  'carritos',
  'clientes',
  'contenido',
  'informes',
  'panel',
];

const ROLES_SEED: Array<Pick<Rol, 'nombre' | 'descripcion' | 'modulos' | 'esSistema'>> = [
  {
    nombre: 'super_admin',
    descripcion: 'Acceso total a todos los módulos del panel',
    modulos: TODOS_LOS_MODULOS,
    esSistema: true,
  },
  {
    nombre: 'marketing',
    descripcion: 'Dashboard, landings y contenido',
    modulos: ['dashboard', 'landings', 'contenido'],
    esSistema: false,
  },
  {
    nombre: 'backoffice',
    descripcion: 'Productos, clientes y carritos',
    modulos: ['productos', 'clientes', 'carritos'],
    esSistema: false,
  },
  {
    nombre: 'informes',
    descripcion: 'Dashboard e informes',
    modulos: ['dashboard', 'informes'],
    esSistema: false,
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Rol) private readonly rolRepository: Repository<Rol>,
  ) {}

  async onModuleInit() {
    for (const seed of ROLES_SEED) {
      const existente = await this.rolRepository.findOne({ where: { nombre: seed.nombre } });
      if (!existente) {
        await this.rolRepository.save(this.rolRepository.create(seed));
        this.logger.log(`Rol '${seed.nombre}' creado por seed`);
      }
    }
  }

  async listRoles(): Promise<{ data: Rol[]; success: boolean; message: string }> {
    const data = await this.rolRepository.find({ order: { nombre: 'ASC' } });
    return { data, success: true, message: 'OK' };
  }

  async createRol(payload: {
    nombre: string;
    descripcion?: string;
    modulos: string[];
  }): Promise<{ data: Rol | null; success: boolean; message: string }> {
    const existente = await this.rolRepository.findOne({ where: { nombre: payload.nombre } });
    if (existente) {
      return { data: null, success: false, message: 'Ya existe un rol con ese nombre' };
    }
    const rol = await this.rolRepository.save(
      this.rolRepository.create({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        modulos: payload.modulos,
        esSistema: false,
      }),
    );
    return { data: rol, success: true, message: 'Rol creado exitosamente' };
  }

  async updateRol(
    id: number,
    payload: { descripcion?: string; modulos?: string[] },
  ): Promise<{ data: Rol | null; success: boolean; message: string }> {
    const rol = await this.rolRepository.findOne({ where: { id } });
    if (!rol) {
      return { data: null, success: false, message: 'Rol no encontrado' };
    }
    if (rol.esSistema) {
      return { data: null, success: false, message: 'El rol super_admin no puede modificarse' };
    }
    if (payload.descripcion !== undefined) rol.descripcion = payload.descripcion;
    if (payload.modulos !== undefined) rol.modulos = payload.modulos;
    await this.rolRepository.save(rol);
    return { data: rol, success: true, message: 'Rol actualizado exitosamente' };
  }
}
