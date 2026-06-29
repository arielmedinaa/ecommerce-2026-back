import { Vertical } from '@content/verticales/schemas/verticales.schemas';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VerticalValidation {
  private readonly logger = new Logger(VerticalValidation.name);

  async validateVertical(
    vertical: Vertical,
  ): Promise<{ isValid: boolean; error: string | null }> {
    if (!vertical.nombre) {
      this.logger.error('Error al validar el nombre de la vertical', {
        vertical,
      });
      return { isValid: false, error: 'Nombre de vertical es requerido' };
    }

    if (!vertical.url) {
      this.logger.error('Error al validar la url de la vertical', {
        vertical,
      });
      return { isValid: false, error: 'Url de vertical es requerida' };
    }

    return { isValid: true, error: null };
  }

  async validateFilters(
    filters: any = {}
  ): Promise<{ isValid: boolean; error: string | null }> {
    console.log("Filters", filters)
    if (!filters) {
      this.logger.error('Error al validar los filtros', {
        filters,
      });
      return { isValid: false, error: 'Filtros son requeridos' };
    };

    if (!filters.limit) {
      this.logger.error('Error al validar el limite de los filtros', {
        filters,
      });
      return { isValid: false, error: 'Limite de filtros es requerido' };
    };

    // if (!filters.offset) {
    //   this.logger.error('Error al validar el offset de los filtros', {
    //     filters,
    //   });
    //   return { isValid: false, error: 'Offset de filtros es requerido' };
    // };
    
    return { isValid: true, error: null };
  }
}
