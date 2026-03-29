import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EventCondition,
  ConditionType,
} from '../../schemas/event-condition.schema';

@Injectable()
export class ConditionsService {
  private readonly logger = new Logger(ConditionsService.name);

  constructor(
    @InjectRepository(EventCondition, 'WRITE_CONNECTION')
    private readonly conditionRepository: Repository<EventCondition>,

    @InjectRepository(EventCondition, 'READ_CONNECTION')
    private readonly conditionRepositoryRead: Repository<EventCondition>,
  ) {}

  async createCondition(
    evento_id: number,
    tipo: ConditionType,
    valor: string,
    activo: boolean = true,
  ): Promise<{ data: EventCondition; message: string; success: boolean }> {
    try {
      const condition = this.conditionRepository.create({
        evento_id,
        tipo,
        valor,
        activo,
      });
      const saved = await this.conditionRepository.save(condition);
      return {
        data: saved,
        message: 'CONDICIÓN CREADA CON EXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al crear condición', error);
      throw new BadRequestException('Error al crear la condición.');
    }
  }

  async findByEvent(evento_id: number): Promise<EventCondition[]> {
    return await this.conditionRepositoryRead.find({
      where: { evento_id, activo: true },
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<{ conditions: EventCondition[]; total: number; pages: number }> {
    const skip = Math.max(0, (page - 1) * limit);
    const queryBuilder =
      this.conditionRepositoryRead.createQueryBuilder('condition');

    if (filters.evento_id) {
      queryBuilder.andWhere('condition.evento_id = :evento_id', {
        evento_id: filters.evento_id,
      });
    }
    if (filters.tipo) {
      queryBuilder.andWhere('condition.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.activo !== undefined) {
      queryBuilder.andWhere('condition.activo = :activo', {
        activo: filters.activo,
      });
    }

    const [conditions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('condition.createdAt', 'DESC')
      .getManyAndCount();

    return {
      conditions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteCondition(id: number): Promise<void> {
    const result = await this.conditionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Condición con ID ${id} no encontrada`);
    }
  }

  async toggleCondition(id: number): Promise<EventCondition> {
    const condition = await this.conditionRepositoryRead.findOne({
      where: { id },
    });
    if (!condition) {
      throw new NotFoundException(`Condición con ID ${id} no encontrada`);
    }
    condition.activo = !condition.activo;
    return await this.conditionRepository.save(condition);
  }
}
