import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartError } from '../../schemas/errors/cart-error.entity';
import * as moment from 'moment-timezone';

@Injectable()
export class CartErrorService {
  constructor(
    @InjectRepository(CartError, 'WRITE_CONNECTION')
    private readonly cartErrorRepository: Repository<CartError>,
    @InjectRepository(CartError, 'READ_CONNECTION')
    private readonly cartErrorRepositoryRead: Repository<CartError>,
  ) {}

  async logError(
    cartId: string,
    errorCode: string,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    path?: string,
  ): Promise<CartError | null> {
    try {
      const errorLog = this.cartErrorRepository.create({
        cartId,
        errorCode,
        message,
        context: {
          ...context,
          timestamp: moment()
            .tz('America/Asuncion')
            .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          service: 'cart-microservice',
        },
        stackTrace,
        path,
      });

      return await this.cartErrorRepository.save(errorLog);
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
  ): Promise<CartError | null> {
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

  async getErrorLogs(cartId?: string, limit = 100): Promise<CartError[]> {
    const where = cartId ? { cartId } : {};
    return await this.cartErrorRepositoryRead.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getErrorStats(): Promise<any> {
    const stats = await this.cartErrorRepositoryRead
      .createQueryBuilder('error')
      .select('error.errorCode', 'errorCode')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(error.createdAt)', 'lastOccurrence')
      .groupBy('error.errorCode')
      .orderBy('count', 'DESC')
      .getRawMany();

    return stats;
  }
}
