import { Injectable, Logger } from '@nestjs/common';
import { PaymentErrorService } from './errors/payment-error.service';

@Injectable()
export class PaymentsValidationService {
  private readonly logger = new Logger(PaymentsValidationService.name);

  constructor(private readonly paymentErrorService: PaymentErrorService) {}

  async validatePaymentPayload(
    codigoCarrito: number,
    carrito: any,
    metodoPago: string,
    monto: number,
    moneda: string,
    cliente?: any,
    descripcion?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    // Validar código de carrito
    if (!codigoCarrito || codigoCarrito <= 0) {
      const error = new Error('Código de carrito inválido');
      await this.paymentErrorService.logMicroserviceError(
        error,
        codigoCarrito?.toString(),
        'validatePaymentPayload',
        {
          motivo: 'codigo_carrito_invalido',
          codigoCarrito,
        },
      );
      this.logger.error('Error al validar código de carrito', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Código de carrito no válido - debe ser mayor a 0',
          data: [],
        },
      };
    }

    // Validar carrito
    if (!carrito) {
      const error = new Error('Carrito es null o undefined');
      await this.paymentErrorService.logMicroserviceError(
        error,
        codigoCarrito?.toString(),
        'validatePaymentPayload',
        {
          motivo: 'carrito_null',
          carrito,
          codigoCarrito,
        },
      );
      this.logger.error('Error al validar el carrito', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Carrito no válido - el carrito es requerido',
          data: [],
        },
      };
    }

    // Validar método de pago
    const metodosPagoValidos = ['pagopar', 'bancard', 'efectivo contra entrega', 'tarjeta contra entrega'];
    if (!metodoPago || !metodosPagoValidos.includes(metodoPago)) {
      const error = new Error('Método de pago inválido');
      await this.paymentErrorService.logMicroserviceError(
        error,
        codigoCarrito?.toString(),
        'validatePaymentPayload',
        {
          motivo: 'metodo_pago_invalido',
          metodoPago,
          metodosValidos: metodosPagoValidos,
          codigoCarrito,
        },
      );
      this.logger.error('Error al validar método de pago', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Método de pago no válido - debe ser: ' + metodosPagoValidos.join(', '),
          data: [],
        },
      };
    }

    // Validar monto
    if (!monto || monto <= 0) {
      const error = new Error('Monto inválido');
      await this.paymentErrorService.logMicroserviceError(
        error,
        codigoCarrito?.toString(),
        'validatePaymentPayload',
        {
          motivo: 'monto_invalido',
          monto,
          codigoCarrito,
        },
      );
      this.logger.error('Error al validar monto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Monto no válido - debe ser mayor a 0',
          data: [],
        },
      };
    }

    // Validar moneda
    if (!moneda || moneda.trim() === '') {
      const error = new Error('Moneda inválida');
      await this.paymentErrorService.logMicroserviceError(
        error,
        codigoCarrito?.toString(),
        'validatePaymentPayload',
        {
          motivo: 'moneda_invalida',
          moneda,
          codigoCarrito,
        },
      );
      this.logger.error('Error al validar moneda', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Moneda no válida - es requerida',
          data: [],
        },
      };
    }

    // Validar cliente (opcional pero si existe debe tener email)
    // if (cliente && (!cliente.email || cliente.email.trim() === '')) {
    //   const error = new Error('Cliente sin email');
    //   await this.paymentErrorService.logMicroserviceError(
    //     error,
    //     codigoCarrito?.toString(),
    //     'validatePaymentPayload',
    //     {
    //       motivo: 'cliente_sin_email',
    //       cliente,
    //       codigoCarrito,
    //     },
    //   );
    //   this.logger.error('Error al validar cliente', error);
    //   return {
    //     isValid: false,
    //     error: {
    //       success: false,
    //       message: 'Cliente no válido - el email es requerido',
    //       data: [],
    //     },
    //   };
    // }

    return { isValid: true };
  }

  async validatePaymentUpdate(
    idTransaccion: string,
    estado: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    // Validar ID de transacción
    if (!idTransaccion || idTransaccion.trim() === '') {
      const error = new Error('ID de transacción inválido');
      await this.paymentErrorService.logMicroserviceError(
        error,
        idTransaccion,
        'validatePaymentUpdate',
        {
          motivo: 'id_transaccion_invalido',
          idTransaccion,
        },
      );
      this.logger.error('Error al validar ID de transacción', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'ID de transacción no válido - es requerido',
          data: [],
        },
      };
    }

    // Validar estado
    const estadosValidos = ['pendiente', 'procesando', 'completado', 'fallido', 'cancelado', 'reembolsado'];
    if (!estado || !estadosValidos.includes(estado)) {
      const error = new Error('Estado de pago inválido');
      await this.paymentErrorService.logMicroserviceError(
        error,
        idTransaccion,
        'validatePaymentUpdate',
        {
          motivo: 'estado_invalido',
          estado,
          estadosValidos: estadosValidos,
          idTransaccion,
        },
      );
      this.logger.error('Error al validar estado de pago', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Estado no válido - debe ser: ' + estadosValidos.join(', '),
          data: [],
        },
      };
    }

    return { isValid: true };
  }
}
