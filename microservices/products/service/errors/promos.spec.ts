import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromosValidationService {
  private readonly logger = new Logger(PromosValidationService.name);

  async validatePromoPayload(
    createData: any,
    codigo?: number,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (createData.nombre.trim() === '') {
      this.logger.error('El nombre de la promo es requerido');
      return {
        isValid: false,
        error: {
          success: false,
          message: 'El nombre de la promo es requerido',
          data: [],
        },
      };
    }

    for (const contenido of createData.contenido.producto) {
      let contado = contenido.contado;
      let credito = contenido.credito;
      let tope = contenido.tope;
      if (contenido.codigo.trim() === '') {
        this.logger.error('El codigo del producto es requerido');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El codigo del producto es requerido',
            data: [],
          },
        };
      }

      if (
        contado.valor === undefined ||
        contado.valor === null ||
        contado.valor === ''
      ) {
        this.logger.error('El valor del producto es requerido');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El valor del producto es requerido',
            data: [],
          },
        };
      }

      if (contado.valor < contado.costo) {
        this.logger.error('El valor del producto debe ser mayor al costo');
        return {
          isValid: false,
          error: {
            success: false,
            message: 'El valor del producto debe ser mayor al costo',
            data: [],
          },
        };
      }

      for (const cuota of credito) {
        if (cuota.valor < cuota.costo) {
          this.logger.error('El valor de la cuota debe ser mayor al costo');
          return {
            isValid: false,
            error: {
              success: false,
              message: `El valor de la cuota debe ser mayor al costo en el producto con codigo ${contenido.codigo}`,
              data: [],
            },
          };
        }

        if (cuota.valor === 0) {
          this.logger.error('El valor de la cuota no puede ser 0');
          return {
            isValid: false,
            error: {
              success: false,
              message: `El valor de la cuota no puede ser 0 en el producto con codigo ${contenido.codigo}`,
              data: [],
            },
          };
        }

        if (cuota.numero_cuota === 0) {
          this.logger.error('El numero de la cuota no puede ser 0');
          return {
            isValid: false,
            error: {
              success: false,
              message: `El numero de la cuota no puede ser 0 en el producto con codigo ${contenido.codigo}`,
              data: [],
            },
          };
        }
      }
    }

    return {
      isValid: true,
    };
  }
}
