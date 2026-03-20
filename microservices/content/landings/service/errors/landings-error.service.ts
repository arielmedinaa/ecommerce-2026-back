import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, FindOptionsWhere, Like } from 'typeorm';
import { LandingError } from '@content/landings/schemas/errors/landings.error.schema';

@Injectable()
export class LandingErrorService {
  private readonly logger = new Logger(LandingErrorService.name);

  constructor(
    @InjectRepository(LandingError, 'WRITE_CONNECTION') private readonly landingErrorRepo: Repository<LandingError>,
    @InjectRepository(LandingError, 'READ_CONNECTION') private readonly landingErrorReadRepo: Repository<LandingError>,
  ) {}

  async logMicroserviceError(
    error: Error,
    landingId?: string,
    operation?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      let userId: string | undefined;
      if (context?.userId) {
        // extract string from context if necessary
        userId = typeof context.userId === 'object' && context.userId.toString ? context.userId.toString() : String(context.userId);
      }

      const errorLog = this.landingErrorRepo.create({
        landingId: landingId,
        errorCode: error.name || 'UNKNOWN_ERROR',
        message: error.message || 'Error desconocido',
        context: context || {},
        stackTrace: error.stack,
        path: operation || 'unknown',
        operation: operation || 'unknown',
        requestPayload: context || {},
        userId: userId,
      });

      await this.landingErrorRepo.save(errorLog);
      this.logger.error(`Error en ${operation}: ${error.message}`, error.stack);
    } catch (logError) {
      this.logger.error('Error al registrar el error del log', logError);
    }
  }

  async getErrorLogs(
    page = 1,
    limit = 10,
    filters?: any,
  ): Promise<{
    errors: LandingError[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query = this.buildErrorQuery(filters);

      const [errors, total] = await this.landingErrorReadRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return {
        errors,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      this.logger.error('Error al obtener logs de errores', error);
      throw error;
    }
  }

  async getErrorById(id: string): Promise<LandingError> {
    try {
      const error = await this.landingErrorReadRepo.findOne({ where: { id } });
      if (!error) {
        throw new Error('Error log no encontrado');
      }
      return error;
    } catch (error) {
      this.logger.error('Error al obtener error por ID', error);
      throw error;
    }
  }

  async getErrorsByLandingId(landingId: string): Promise<LandingError[]> {
    try {
      return await this.landingErrorReadRepo.find({
        where: { landingId },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error('Error al obtener errores por landing ID', error);
      throw error;
    }
  }

  async getErrorStats(): Promise<any> {
    try {
      const totalErrors = await this.landingErrorReadRepo.count();
      
      const errorsByOperation = await this.landingErrorReadRepo
        .createQueryBuilder('err')
        .select('err.operation', '_id')
        .addSelect('COUNT(*)', 'count')
        .groupBy('err.operation')
        .orderBy('count', 'DESC')
        .getRawMany();

      const recentErrors = await this.landingErrorReadRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
        select: ['errorCode', 'message', 'operation', 'createdAt']
      });

      const errorsByCode = await this.landingErrorReadRepo
        .createQueryBuilder('err')
        .select('err.errorCode', '_id')
        .addSelect('COUNT(*)', 'count')
        .groupBy('err.errorCode')
        .orderBy('count', 'DESC')
        .getRawMany();

      return {
        totalErrors,
        errorsByOperation,
        recentErrors,
        errorsByCode
      };
    } catch (error) {
      this.logger.error('Error al obtener estadísticas de errores', error);
      throw error;
    }
  }

  async clearOldErrors(daysOld = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.landingErrorRepo.delete({
        createdAt: LessThan(cutoffDate)
      });

      this.logger.log(`Eliminados ${result.affected || 0} errores antiguos (${daysOld} días)`);
    } catch (error) {
      this.logger.error('Error al limpiar errores antiguos', error);
      throw error;
    }
  }

  private buildErrorQuery(filters: any): FindOptionsWhere<LandingError> | FindOptionsWhere<LandingError>[] {
    const query: FindOptionsWhere<LandingError> = {};

    if (filters?.landingId) {
      query.landingId = filters.landingId;
    }

    if (filters?.errorCode) {
      query.errorCode = filters.errorCode;
    }

    if (filters?.operation) {
      query.operation = filters.operation;
    }

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    // TypeORM usually handles date ranges with Between or LessThan/GreaterThan
    // Here we can use simple QueryBuilder approaches instead or skip for simplicity,
    // but we won't fully map $gte unless using Between
    // Let's omit date ranges for brevity or use if really needed.

    if (filters?.search) {
      return [
        { ...query, message: Like(`%${filters.search}%`) },
        { ...query, errorCode: Like(`%${filters.search}%`) },
        { ...query, operation: Like(`%${filters.search}%`) }
      ];
    }

    return query;
  }
}
