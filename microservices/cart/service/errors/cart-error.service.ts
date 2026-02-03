import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CartError, CartErrorDocument } from '../../schemas/errors/cart.error.schema';
import moment from 'moment-timezone';

@Injectable()
export class CartErrorService {
  constructor(
    @InjectModel(CartError.name)
    private readonly cartErrorModel: Model<CartErrorDocument>,
  ) {}

  async logError(
    cartId: string,
    errorCode: string,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    path?: string,
  ): Promise<CartErrorDocument | null> {
    try {
      const errorLog = new this.cartErrorModel({
        cartId,
        errorCode,
        message,
        context: {
          ...context,
          timestamp: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          service: 'cart-microservice',
        },
        stackTrace,
        path,
      });

      return await errorLog.save();
    } catch (logError) {
      console.error('Error al guardar log de error:', logError);
      return null;
    }
  }

  async logMicroserviceError(
    error: any,
    cartId?: string,
    operation?: string,
    additionalContext?: Record<string, any>,
  ): Promise<CartErrorDocument | null> {
    const errorCode = error.name || 'UNKNOWN_ERROR';
    const message = error.message || 'Error desconocido';
    
    return this.logError(
      cartId || 'unknown',
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
    );
  }

  async getErrorLogs(cartId?: string, limit = 100): Promise<CartErrorDocument[]> {
    const filter = cartId ? { cartId } : {};
    return this.cartErrorModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getErrorStats(): Promise<any> {
    const stats = await this.cartErrorModel.aggregate([
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
}
