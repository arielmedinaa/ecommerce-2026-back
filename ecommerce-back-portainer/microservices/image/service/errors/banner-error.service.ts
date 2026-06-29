import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerError } from '../../schemas/errors/banners.error.schema';
import * as moment from 'moment-timezone';

@Injectable()
export class BannerErrorService {
  constructor(
    @InjectRepository(BannerError, 'WRITE_CONNECTION')
    private readonly bannerErrorRepository: Repository<BannerError>,
  ) {}

  async logError(
    bannerId: string,
    errorCode: string,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    path?: string,
    operation?: string,
    userId?: string,
    fileName?: string,
    device?: string,
  ): Promise<BannerError | null> {
    try {
      const errorLog = this.bannerErrorRepository.create({
        bannerId,
        errorCode,
        message,
        context: {
          ...context,
          timestamp: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          service: 'image-microservice',
        },
        stackTrace,
        path,
        operation,
        userId,
        fileName,
        device,
      });

      return await this.bannerErrorRepository.save(errorLog);
    } catch (logError) {
      console.error('Error al guardar log de error de banner:', logError);
      return null;
    }
  }

  async logMicroserviceError(
    error: any,
    bannerId?: string,
    operation?: string,
    additionalContext?: Record<string, any>,
    userId?: string,
    fileName?: string,
    device?: string,
  ): Promise<BannerError | null> {
    const errorCode = error.name || 'UNKNOWN_ERROR';
    const message = error.message || 'Error desconocido';
    
    return this.logError(
      bannerId || 'unknown',
      errorCode,
      message,
      {
        operation,
        ...additionalContext,
        originalError: {
          name: error.name,
          message: error.message,
          code: error.code,
          status: error.status,
        },
      },
      error.stack,
      error.path || operation,
      operation,
      userId,
      fileName,
      device,
    );
  }

  async logValidationError(
    bannerId: string,
    operation: string,
    motivo: string,
    additionalData?: Record<string, any>,
    userId?: string,
  ): Promise<BannerError | null> {
    return this.logError(
      bannerId,
      'VALIDATION_ERROR',
      `Error de validación: ${motivo}`,
      {
        motivo,
        ...additionalData,
      },
      undefined,
      operation,
      operation,
      userId,
    );
  }

  async logFileProcessingError(
    bannerId: string,
    fileName: string,
    device: string,
    error: any,
    operation: string = 'process_image',
    userId?: string,
  ): Promise<BannerError | null> {
    return this.logError(
      bannerId,
      'FILE_PROCESSING_ERROR',
      `Error procesando archivo ${fileName} para dispositivo ${device}`,
      {
        fileName,
        device,
        originalError: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
      },
      error.stack,
      operation,
      operation,
      userId,
      fileName,
      device,
    );
  }

  async getErrorLogs(bannerId?: string, limit = 100): Promise<BannerError[]> {
    const filter = bannerId ? { bannerId } : {};
    return this.bannerErrorRepository.find({
      where: filter,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getErrorStats(): Promise<any> {
    const stats = await this.bannerErrorRepository.createQueryBuilder('error')
      .select('error.errorCode', '_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(error.createdAt)', 'lastOccurrence')
      .groupBy('error.errorCode')
      .orderBy('count', 'DESC')
      .getRawMany();

    return stats.map(stat => ({
      ...stat,
      count: parseInt(stat.count, 10), // MariaDB COUNT is typically returned as string by mysql2
    }));
  }

  async getErrorsByOperation(operation: string, limit = 50): Promise<BannerError[]> {
    return this.bannerErrorRepository.find({
      where: { operation },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getErrorsByDevice(device: string, limit = 50): Promise<BannerError[]> {
    return this.bannerErrorRepository.find({
      where: { device },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async clearOldLogs(daysOld = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = moment().tz('America/Asuncion').subtract(daysOld, 'days').toDate();
    
    const result = await this.bannerErrorRepository.createQueryBuilder()
      .delete()
      .from(BannerError)
      .where("createdAt < :cutoffDate", { cutoffDate })
      .execute();

    return { deletedCount: result.affected || 0 };
  }
}
