import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromosValidationService {
  private readonly logger = new Logger(PromosValidationService.name);

  async validatePromoPayload(
    createData: any,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!createData.nombre_promo || createData.nombre_promo.trim() === '') {
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
    
    return { isValid: true };
  }
}
