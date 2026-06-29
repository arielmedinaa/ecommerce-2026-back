import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment-timezone';

@Injectable()
export class PaymentErrorService {
  private readonly logger = new Logger(PaymentErrorService.name);

  async logError(
    paymentId: string,
    errorCode: string,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    path?: string,
  ): Promise<any | null> {
    try {
      const errorLog = {
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
      };

      this.logger.error(`Payment Error [${errorCode}]: ${message}`, errorLog);
      return errorLog;
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
  ): Promise<any | null> {
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

  async getErrorLogs(paymentId?: string, limit = 100): Promise<any[]> {
    // Implementación simple sin MongoDB
    this.logger.log(`Getting error logs for payment: ${paymentId}, limit: ${limit}`);
    return [];
  }

  async getErrorStats(): Promise<any> {
    // Implementación simple sin MongoDB
    this.logger.log('Getting error stats');
    return {};
  }

  async getPaymentErrorHistory(paymentId: string): Promise<any[]> {
    // Implementación simple sin MongoDB
    this.logger.log(`Getting payment error history for: ${paymentId}`);
    return [];
  }

  async logPaymentGatewayError(
    paymentId: string,
    gateway: string,
    gatewayResponse: any,
    error: any,
  ): Promise<any | null> {
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
  ): Promise<any | null> {
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