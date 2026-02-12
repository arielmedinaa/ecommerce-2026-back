import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LandingError, LandingErrorDocument } from '../../schemas/errors/landings.error.schema';

@Injectable()
export class LandingErrorService {
  private readonly logger = new Logger(LandingErrorService.name);

  constructor(
    @InjectModel(LandingError.name) private readonly landingErrorModel: Model<LandingErrorDocument>,
  ) {}

  async logMicroserviceError(
    error: Error,
    landingId?: string,
    operation?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      const errorLog = new this.landingErrorModel({
        landingId: landingId ? new Types.ObjectId(landingId) : null,
        errorCode: error.name || 'UNKNOWN_ERROR',
        message: error.message || 'Error desconocido',
        context: context || {},
        stackTrace: error.stack,
        path: operation || 'unknown',
        operation: operation || 'unknown',
        requestPayload: context || {},
        userId: context?.userId || null,
      });

      await errorLog.save();
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

      const [errors, total] = await Promise.all([
        this.landingErrorModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.landingErrorModel.countDocuments(query)
      ]);

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
      const error = await this.landingErrorModel.findById(id).exec();
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
      return await this.landingErrorModel
        .find({ landingId: new Types.ObjectId(landingId) })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error al obtener errores por landing ID', error);
      throw error;
    }
  }

  async getErrorStats(): Promise<any> {
    try {
      const [
        totalErrors,
        errorsByOperation,
        recentErrors,
        errorsByCode
      ] = await Promise.all([
        this.landingErrorModel.countDocuments(),
        this.landingErrorModel.aggregate([
          { $group: { _id: '$operation', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        this.landingErrorModel
          .find()
          .sort({ createdAt: -1 })
          .limit(10)
          .select('errorCode message operation createdAt')
          .exec(),
        this.landingErrorModel.aggregate([
          { $group: { _id: '$errorCode', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

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

      const result = await this.landingErrorModel.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      this.logger.log(`Eliminados ${result.deletedCount} errores antiguos (${daysOld} días)`);
    } catch (error) {
      this.logger.error('Error al limpiar errores antiguos', error);
      throw error;
    }
  }

  private buildErrorQuery(filters: any): any {
    const query: any = {};

    if (filters?.landingId) {
      query.landingId = new Types.ObjectId(filters.landingId);
    }

    if (filters?.errorCode) {
      query.errorCode = filters.errorCode;
    }

    if (filters?.operation) {
      query.operation = filters.operation;
    }

    if (filters?.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters?.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    if (filters?.search) {
      query.$or = [
        { message: { $regex: filters.search, $options: 'i' } },
        { errorCode: { $regex: filters.search, $options: 'i' } },
        { operation: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return query;
  }
}
