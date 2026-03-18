import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromosValidationService } from './errors/promos.spec';
import { Promo } from '../schemas/promo.schemas';

@Injectable()
export class PromosService {
  private readonly logger = new Logger(PromosService.name);

  constructor(
    @InjectRepository(Promo, 'WRITE_CONNECTION')
    private readonly promoWriteRepository: Repository<Promo>,
    @InjectRepository(Promo, 'READ_CONNECTION')
    private readonly promoReadRepository: Repository<Promo>,
    private readonly promosValidationService: PromosValidationService,
  ) {}

  async findAll(filters: any = {}): Promise<Promo[]> {
    return this.promoReadRepository.find({
      take: Number(filters.limit) || 10,
      skip: Number(filters.offset) || 0,
    });
  }

  async createPromo(promoData: any): Promise<{ data: any; success: boolean; message: string }> {
    const validation = await this.promosValidationService.validatePromoPayload(promoData);
    if (!validation.isValid) {
      return {
        data: null,
        success: false,
        message: validation.error.message,
      };
    }
    
    try {
      const newPromo = this.promoWriteRepository.create(promoData);
      const result = await this.promoWriteRepository.save(newPromo);
      return {
        data: result,
        success: true,
        message: 'PROMO CREADA EXITOSAMENTE',
      };
    } catch (error) {
      this.logger.error('Error createPromo', error);
      return {
        data: null,
        success: false,
        message: `Error al crear promo: ${error.message}`,
      };
    }
  }
}
