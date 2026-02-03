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

    if (!cuenta || cuenta.trim() === '') {
      const error = new Error('Cuenta de cliente inválida');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'validateCartPayload',
        {
          motivo: 'cuenta_invalida',
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
          message: 'Cuenta de cliente no válida',
          data: [],
        },
      };
    }

    return await this.validateProduct(producto, codigo?.toString());
  }
}
