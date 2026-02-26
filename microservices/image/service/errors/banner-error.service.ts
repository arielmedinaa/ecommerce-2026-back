import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BannerError, BannerErrorDocument } from '../../schemas/errors/banners.error.schema';
import moment from 'moment-timezone';

@Injectable()
export class BannerErrorService {
  constructor(
    @InjectModel('BannerError')
    private readonly bannerErrorModel: Model<BannerErrorDocument>,
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
  ): Promise<BannerErrorDocument | null> {
    try {
      const errorLog = new this.bannerErrorModel({
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

      return await errorLog.save();
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
  ): Promise<BannerErrorDocument | null> {
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
  ): Promise<BannerErrorDocument | null> {
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
  ): Promise<BannerErrorDocument | null> {
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

  async getErrorLogs(bannerId?: string, limit = 100): Promise<BannerErrorDocument[]> {
    const filter = bannerId ? { bannerId } : {};
    return this.bannerErrorModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getErrorStats(): Promise<any> {
    const stats = await this.bannerErrorModel.aggregate([
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return stats;
  }

  async getErrorsByOperation(operation: string, limit = 50): Promise<BannerErrorDocument[]> {
    return this.bannerErrorModel
      .find({ operation })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getErrorsByDevice(device: string, limit = 50): Promise<BannerErrorDocument[]> {
    return this.bannerErrorModel
      .find({ device })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async clearOldLogs(daysOld = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = moment().tz('America/Asuncion').subtract(daysOld, 'days').toDate();
    
    const result = await this.bannerErrorModel.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}
