import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vertical } from '../schemas/verticales.schemas';
import { Repository } from 'typeorm';
import { VerticalValidation } from './valid/vertical.validation';

@Injectable()
export class VerticalesService {
  private readonly logger = new Logger(VerticalesService.name);
  private verticalCache: Map<string, { data: Vertical[]; timestamp: number }> =
    new Map();
  private readonly cacheTTL = 30 * 1000;

  constructor(
    @InjectRepository(Vertical, 'WRITE_CONNECTION')
    private readonly verticalRepository: Repository<Vertical>,
    @InjectRepository(Vertical, 'READ_CONNECTION')
    private readonly verticalRepositoryRead: Repository<Vertical>,
    private readonly verticalValidation: VerticalValidation,
  ) {}

  async create(
    vertical: any,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    const validation = await this.verticalValidation.validateVertical(vertical);
    if (!validation.isValid) {
      this.logger.error(
        'Error de validación al crear vertical',
        validation.error,
      );
      return {
        data: null,
        message: validation.error,
        success: false,
      };
    }

    try {
      const result = await this.verticalRepository.save(vertical);
      this.invalidateCache();

      return {
        data: result,
        message: 'VERTICAL CREADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al crear vertical', error);
      return {
        data: null,
        message: 'ERROR AL CREAR VERTICAL',
        success: false,
      };
    }
  }

  async findAll(filters: any = {}): Promise<{
    data: Vertical[];
    message: string;
    success: boolean;
    total?: number;
  }> {
    const validation = await this.verticalValidation.validateFilters(filters);
    if (!validation.isValid) {
      this.logger.error('Error de validación en filtros', validation.error);
      return {
        data: [],
        message: validation.error,
        success: false,
        total: 0,
      };
    }

    const cacheKey = `vertical_cache_${JSON.stringify(filters)}`;
    const now = Date.now();
    const cached = this.verticalCache.get(cacheKey);

    if (cached && now - cached.timestamp < this.cacheTTL) {
      return {
        data: cached.data,
        message: 'VERTICALES OBTENIDAS DESDE CACHE',
        success: true,
        total: cached.data.length,
      };
    }

    try {
      const result = await this.verticalRepositoryRead.find(filters);
      if (!result || result.length === 0) {
        return {
          data: [],
          message: 'NO SE ENCONTRARON VERTICALES',
          success: false,
          total: 0,
        };
      }

      this.verticalCache.set(cacheKey, {
        data: result,
        timestamp: now,
      });

      return {
        data: result,
        message: 'VERTICALES OBTENIDAS CON ÉXITO',
        success: true,
        total: result.length,
      };
    } catch (error) {
      this.logger.error('Error al obtener verticales', error);
      return {
        data: [],
        message: 'ERROR AL OBTENER VERTICALES',
        success: false,
        total: 0,
      };
    }
  }

  async findOne(
    id: number,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    try {
      const result = await this.verticalRepositoryRead.findOne({
        where: { id },
      });

      if (!result) {
        return {
          data: null,
          message: 'VERTICAL NO ENCONTRADA',
          success: false,
        };
      }

      return {
        data: result,
        message: 'VERTICAL OBTENIDA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al obtener vertical', error);
      return {
        data: null,
        message: 'ERROR AL OBTENER VERTICAL',
        success: false,
      };
    }
  }

  async update(
    id: number,
    verticalData: any,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    const verticalValidation =
      await this.verticalValidation.validateVertical(verticalData);
    if (!verticalValidation.isValid) {
      return {
        data: null,
        message: verticalValidation.error,
        success: false,
      };
    }

    try {
      const result = await this.verticalRepository.update(id, verticalData);
      if (result.affected === 0) {
        return {
          data: null,
          message: 'VERTICAL NO ENCONTRADA PARA ACTUALIZAR',
          success: false,
        };
      }

      this.invalidateCache();
      const updatedVertical = await this.verticalRepositoryRead.findOne({
        where: { id },
      });

      return {
        data: updatedVertical,
        message: 'VERTICAL ACTUALIZADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al actualizar vertical', error);
      return {
        data: null,
        message: 'ERROR AL ACTUALIZAR VERTICAL',
        success: false,
      };
    }
  }

  async remove(id: number): Promise<{ message: string; success: boolean }> {
    try {
      const result = await this.verticalRepository.delete(id);
      if (result.affected === 0) {
        return {
          message: 'VERTICAL NO ENCONTRADA PARA ELIMINAR',
          success: false,
        };
      }

      this.invalidateCache();

      return {
        message: 'VERTICAL ELIMINADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al eliminar vertical', error);
      return {
        message: 'ERROR AL ELIMINAR VERTICAL',
        success: false,
      };
    }
  }

  private invalidateCache(): void {
    this.verticalCache.clear();
  }
}
