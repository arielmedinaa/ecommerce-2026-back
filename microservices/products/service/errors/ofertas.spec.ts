import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OfertasValidationService {
  private readonly logger = new Logger(OfertasValidationService.name);

  async validateOfertaPayload(
    createData: any,
    codigo?: number,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!createData.productos || createData.productos.length === 0) {
      this.logger.error('La oferta debe tener al menos un producto');
      return {
        isValid: false,
        error: {
          success: false,
          message: 'La oferta debe tener al menos un producto',
          data: [],
        },
      };
    }

    if (createData.productos.length > 12) {
      this.logger.error('La oferta no puede tener más de 12 productos');
      return {
        isValid: false,
        error: {
          success: false,
          message: 'La oferta no puede tener más de 12 productos',
          data: [],
        },
      };
    }

    for (const producto of createData.productos) {
      if (!producto.nombre || producto.nombre.trim() === '') {
        this.logger.error('Todos los productos deben tener nombre');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'Todos los productos deben tener nombre',
            data: [],
          },
        };
      }

      if (!producto.codigo || producto.codigo.trim() === '') {
        this.logger.error('Todos los productos deben tener código');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'Todos los productos deben tener código',
            data: [],
          },
        };
      }

      // Validar precios no negativos
      if (producto.descuento !== undefined && producto.descuento < 0) {
        this.logger.error('El descuento no puede ser negativo');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El descuento no puede ser negativo',
            data: [],
          },
        };
      }

      if (producto.precioContado !== undefined && producto.precioContado < 0) {
        this.logger.error('El precio contado no puede ser negativo');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El precio contado no puede ser negativo',
            data: [],
          },
        };
      }

      if (producto.precioCredito !== undefined && producto.precioCredito < 0) {
        this.logger.error('El precio crédito no puede ser negativo');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El precio crédito no puede ser negativo',
            data: [],
          },
        };
      }

      // Validar tiempo activo si existe
      if (producto.tiempoActivo !== undefined && producto.tiempoActivo < 0) {
        this.logger.error(
          'El tiempo activo del producto no puede ser negativo',
        );
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El tiempo activo del producto no puede ser negativo',
            data: [],
          },
        };
      }

      // Validar cuotas si existen
      if (producto.cuotas && Array.isArray(producto.cuotas)) {
        for (const cuota of producto.cuotas) {
          if (!cuota.cantidad || cuota.cantidad <= 0) {
            this.logger.error('La cantidad de cuotas debe ser mayor a 0');
            return {
              isValid: false,
              error: {
                success: false,
                message: 'La cantidad de cuotas debe ser mayor a 0',
                data: [],
              },
            };
          }

          if (cuota.valor !== undefined && cuota.valor < 0) {
            this.logger.error('El valor de la cuota no puede ser negativo');
            return {
              isValid: false,
              error: {
                success: false,
                message: 'El valor de la cuota no puede ser negativo',
                data: [],
              },
            };
          }
        }
      }
    }

    // Validar tiempo activo de la oferta
    if (createData.tiempoActivo !== undefined && createData.tiempoActivo <= 0) {
      this.logger.error('El tiempo activo de la oferta debe ser mayor a 0');
      return {
        isValid: false,
        error: {
          success: false,
          message: 'El tiempo activo de la oferta debe ser mayor a 0',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateOfertaId(
    id: string | number,
  ): Promise<{ isValid: boolean; error?: any }> {
    const numId = Number(id);
    if (!id || isNaN(numId) || numId <= 0) {
      this.logger.error('ID de oferta inválido');
      return {
        isValid: false,
        error: {
          success: false,
          message: 'ID de oferta inválido',
          data: [],
        },
      };
    }

    return { isValid: true };
  }
}
