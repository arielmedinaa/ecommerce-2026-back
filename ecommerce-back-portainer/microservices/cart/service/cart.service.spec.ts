import { Injectable, Logger } from '@nestjs/common';
import { CartErrorService } from './errors/cart-error.service';

@Injectable()
export class CartValidationService {
  private readonly logger = new Logger(CartValidationService.name);

  constructor(private readonly cartErrorService: CartErrorService) {}

  async validateProduct(
    producto: any,
    codigo?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!producto) {
      const error = new Error('Producto es null o undefined');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateProduct',
        {
          motivo: 'producto_null',
          producto,
          codigo,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Producto no válido - el producto es requerido',
          data: [],
        },
      };
    }

    if (
      !producto.codigo ||
      producto.codigo === null ||
      producto.codigo === undefined
    ) {
      const error = new Error('Producto con código nulo o inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateProduct',
        {
          motivo: 'codigo_null',
          producto,
          codigo,
          codigoProducto: producto.codigo,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Producto no válido - el código es requerido',
          data: [],
        },
      };
    }

    if (!producto.nombre || producto.nombre.trim() === '') {
      const error = new Error('Producto sin nombre');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateProduct',
        {
          motivo: 'nombre_vacio',
          producto,
          codigo,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Producto no válido - el nombre es requerido',
          data: [],
        },
      };
    }

    if (!producto.cantidad || producto.cantidad <= 0) {
      const error = new Error('Producto con cantidad inválida');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateProduct',
        {
          motivo: 'cantidad_invalida',
          producto,
          codigo,
          cantidad: producto.cantidad,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Producto no válido - la cantidad debe ser mayor a 0',
          data: [],
        },
      };
    }

    if (!producto.precio || producto.precio < 0) {
      const error = new Error('Producto con precio inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateProduct',
        {
          motivo: 'precio_invalido',
          producto,
          codigo,
          precio: producto.precio,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Producto no válido - el precio debe ser mayor o igual a 0',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateCartPayload(
    clienteToken: string,
    cuenta: string,
    codigo?: number,
    producto?: any,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!clienteToken || clienteToken.trim() === '') {
      const error = new Error('Token de cliente inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateCartPayload',
        {
          motivo: 'token_invalido',
          clienteToken,
          cuenta,
          codigo,
        },
      );
      this.logger.error('Error al validar el producto', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Token de cliente no válido',
          data: [],
        },
      };
    }

    // if (!cuenta || cuenta.trim() === '') {
    //   const error = new Error('Cuenta de cliente inválida');
    //   await this.cartErrorService.logMicroserviceError(
    //     error,
    //     codigo?.toString(),
    //     'validateCartPayload',
    //     {
    //       motivo: 'cuenta_invalida',
    //       clienteToken,
    //       cuenta,
    //       codigo,
    //     },
    //   );
    //   this.logger.error('Error al validar el producto', error);
    //   return {
    //     isValid: false,
    //     error: {
    //       success: false,
    //       message: 'Cuenta de cliente no válida',
    //       data: [],
    //     },
    //   };
    // }

    return await this.validateProduct(producto, codigo?.toString());
  }

  async validateFinishCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: number,
    process?: any,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!codigo || codigo <= 0) {
      const error = new Error('Código de carrito inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'codigo_carrito_invalido',
          codigo,
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

    if (!clienteToken || clienteToken.trim() === '') {
      const error = new Error('Token de cliente inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'token_invalido',
          clienteToken,
          codigo,
        },
      );
      this.logger.error('Error al validar token de cliente', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Token de cliente no válido',
          data: [],
        },
      };
    }

    if (!process) {
      const error = new Error('Proceso de pago es requerido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'proceso_null',
          process,
          codigo,
        },
      );
      this.logger.error('Error al validar proceso de pago', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'El proceso de pago es requerido',
          data: [],
        },
      };
    }

    if (!process.tipo || process.tipo.trim() === '') {
      const error = new Error('Tipo de pago es requerido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'tipo_pago_requerido',
          process,
          codigo,
        },
      );
      this.logger.error('Error al validar tipo de pago', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'El tipo de pago es requerido',
          data: [],
        },
      };
    }

    const tiposPagoValidos = [
      'Debito contra entrega',
      'Tarjeta contra entrega',
      'Pagopar',
      'Bancard',
      'Efectivo contra entrega'
    ];

    if (!tiposPagoValidos.includes(process.tipo)) {
      const error = new Error('Tipo de pago no válido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'tipo_pago_invalido',
          tipo: process.tipo,
          tiposValidos: tiposPagoValidos,
          codigo,
        },
      );
      this.logger.error('Error al validar tipo de pago', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: `Tipo de pago no válido. Permitidos: ${tiposPagoValidos.join(', ')}`,
          data: [],
        },
      };
    }

    if (process.tipo === 'Debito contra Entrega') {
      if (!process.cantidadcuotas || process.cantidadcuotas <= 0) {
        const error = new Error('Cantidad de cuotas inválida para Débito contra Entrega');
        await this.cartErrorService.logMicroserviceError(
          error,
          codigo?.toString(),
          'validateFinishCart',
          {
            motivo: 'cantidad_cuotas_invalida',
            cantidadcuotas: process.cantidadcuotas,
            codigo,
          },
        );
        this.logger.error('Error al validar cantidad de cuotas', error);
        return {
          isValid: false,
          error: {
            success: false,
            message: 'La cantidad de cuotas debe ser mayor a 0 para Débito contra Entrega',
            data: [],
          },
        };
      }

      if (!process.cuotas || !Array.isArray(process.cuotas) || process.cuotas.length === 0) {
        const error = new Error('Array de cuotas es requerido para Débito contra Entrega');
        await this.cartErrorService.logMicroserviceError(
          error,
          codigo?.toString(),
          'validateFinishCart',
          {
            motivo: 'cuotas_array_invalido',
            cuotas: process.cuotas,
            codigo,
          },
        );
        this.logger.error('Error al validar array de cuotas', error);
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El array de cuotas es requerido para Débito contra Entrega',
            data: [],
          },
        };
      }

      for (let i = 0; i < process.cuotas.length; i++) {
        const cuota = process.cuotas[i];
        if (!cuota.numero || !cuota.importe || cuota.importe <= 0) {
          const error = new Error(`Estructura de cuota ${i + 1} inválida`);
          await this.cartErrorService.logMicroserviceError(
            error,
            codigo?.toString(),
            'validateFinishCart',
            {
              motivo: 'cuota_estructura_invalida',
              cuotaIndex: i,
              cuota,
              codigo,
            },
          );
          this.logger.error('Error al validar estructura de cuota', error);
          return {
            isValid: false,
            error: {
              success: false,
              message: `La cuota ${i + 1} debe tener número e importe mayor a 0`,
              data: [],
            },
          };
        }
      }
    }

    if (process.moneda && process.moneda.trim() === '') {
      const error = new Error('Moneda no puede estar vacía');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'moneda_vacia',
          moneda: process.moneda,
          codigo,
        },
      );
      this.logger.error('Error al validar moneda', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'La moneda no puede estar vacía',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateInsertCentralApp(
    solicitud: Object,
    clienteToken: string,
    codigo?: number,
    clienteInfo?: Object,
  ): Promise<{ isValid: boolean; error?: any }> {

    if (!solicitud || [solicitud].length < 0) {
      const error = new Error('Solicitud inválida - No se proporcionó el objeto de la solicitud');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateInsertCentralApp',
        {
          motivo: 'solicitud_invalida',
          solicitud,
          codigo,
        },
      );
      this.logger.error('Erro al proporcionar el cuerpo de la solicitud', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Solicitud inválida - No se proporcionó el objeto de la solicitud',
          data: [],
        },
      }
    }

    // if (!clienteInfo || [clienteInfo].length < 0) {
    //   const error = new Error('Cliente inválido - No se proporcionó el objeto del clienteInfo');
    //   await this.cartErrorService.logMicroserviceError(
    //     error,
    //     codigo?.toString(),
    //     'validateInsertCentralApp',
    //     {
    //       motivo: 'cliente_invalido',
    //       clienteInfo,
    //       codigo,
    //     },
    //   );
    //   this.logger.error('Erro al proporcionar el cuerpo del clienteInfo', error);
    //   return {
    //     isValid: false,
    //     error: {
    //       success: false,
    //       message: 'Cliente inválido - No se proporcionó el objeto del clienteInfo',
    //       data: [],
    //     },
    //   }
    // }

    if (!clienteToken || clienteToken.trim() === '') {
      const error = new Error('Token de cliente inválido');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateFinishCart',
        {
          motivo: 'token_invalido',
          clienteToken,
          codigo,
        },
      );
      this.logger.error('Error al validar token de cliente', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Token de cliente no válido',
          data: [],
        },
      };
    }

    return { isValid: true };
  }
}
