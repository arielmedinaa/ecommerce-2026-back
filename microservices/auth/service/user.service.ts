import { User } from '@auth/schemas/user.schemas';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers(filters: any): Promise<{
    data: any[];
    total: number;
    message: string;
    success: boolean;
    prefetch: any;
  }> {
    const result = await this.userRepository.query(
        'CALL sp_obtener_datos_usuario(?);', [filters.usuarioId || null]
    )
    
    const dbFilter: any = {};
    if (filters.id) dbFilter.id = filters.id;
    if (filters.email) dbFilter.email = filters.email;
    if (filters.nombre) dbFilter.nombre = filters.nombre;
    if (filters.perfil) dbFilter.perfil = filters.perfil;
    if (filters.estaActivo !== undefined) dbFilter.estaActivo = filters.estaActivo;
    dbFilter.perfil = 'cliente';
    
    const [data, total] = await this.userRepository.findAndCount({
      where: dbFilter,
    });

    if (!data) {
      return {
        data: [],
        total: 0,
        message: 'NO SE ENCONTRARON USUARIOS',
        success: false,
        prefetch: [],
      };
    }
    return {
      data,
      total,
      message: 'USUARIOS RECUPERADOS EXISTOSAMENTE',
      success: true,
      prefetch: result
    };
  }

  async searchUsers(filters: any): Promise<{
    data: any[];
    total: number;
    message: string;
    success: boolean;
  }> {
    const [data, total] = await this.userRepository.findAndCount({
      where: filters,
    });
    if (!data) {
      return {
        data: [],
        total: 0,
        message: 'NO SE ENCONTRARON USUARIOS',
        success: false,
      };
    }
    return {
      data,
      total,
      message: 'USUARIOS RECUPERADOS EXISTOSAMENTE',
      success: true,
    };
  }

  async updateUsers(filters: any, updates: any): Promise<{
    data: any;
    total: number;
    message: string;
    success: boolean;
  }> {
    const result = await this.userRepository.update(filters, updates);
    if (!result) {
      return {
        data: [],
        total: 0,
        message: 'NO SE ENCONTRARON USUARIOS',
        success: false,
      };
    }
    return {
      data: result,
      total: result.affected || 0,
      message: 'USUARIOS ACTUALIZADOS EXISTOSAMENTE',
      success: true,
    };
  }
}
