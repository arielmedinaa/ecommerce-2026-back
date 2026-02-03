import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentError, PaymentErrorDocument } from '../../schemas/errors/payment.error.schema';
import moment from 'moment-timezone';

@Injectable()
export class PaymentErrorService {
  constructor(
    @InjectModel(PaymentError.name)
    private readonly paymentErrorModel: Model<PaymentErrorDocument>,
  ) {}

  async logError(
    paymentId: string,
    errorCode: string,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    path?: string,
  ): Promise<PaymentErrorDocument | null> {
    try {
      const errorLog = new this.paymentErrorModel({
        paymentId,
        errorCode,
        message,
        context: {
          ...context,
          timestamp: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          service: 'payments-microservice',
        },
        stackTrace,
        path,
      });

      return await errorLog.save();
    } catch (logError) {
      console.error('Error al guardar log de error de pago:', logError);
      return null;
    }
  }

  async logMicroserviceError(
    error: any,
    paymentId?: string,
    operation?: string,
    additionalContext?: Record<string, any>,
  ): Promise<PaymentErrorDocument | null> {
    const errorCode = error.name || 'UNKNOWN_ERROR';
    const message = error.message || 'Error desconocido';
    
    return this.logError(
      paymentId || 'unknown',
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

  async getErrorLogs(paymentId?: string, limit = 100): Promise<PaymentErrorDocument[]> {
    const filter = paymentId ? { paymentId } : {};
    return this.paymentErrorModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getErrorStats(): Promise<any> {
    const stats = await this.paymentErrorModel.aggregate([
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

  async getPaymentErrorHistory(paymentId: string): Promise<PaymentErrorDocument[]> {
    return this.paymentErrorModel
      .find({ paymentId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async logPaymentGatewayError(
    paymentId: string,
    gateway: string,
    gatewayResponse: any,
    error: any,
  ): Promise<PaymentErrorDocument | null> {
    return this.logError(
      paymentId,
      'GATEWAY_ERROR',
      `Error en pasarela de pago ${gateway}`,
      {
        gateway,
        gatewayResponse,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
      },
      error.stack,
      'payment-gateway',
    );
  }

  async logValidationError(
    paymentId: string,
    field: string,
    value: any,
    validationRule: string,
  ): Promise<PaymentErrorDocument | null> {
    return this.logError(
      paymentId,
      'VALIDATION_ERROR',
      `Error de validación en campo ${field}`,
      {
        field,
        value,
        validationRule,
      },
      undefined,
      'payment-validation',
    );
  }
}