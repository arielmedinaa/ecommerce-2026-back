import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promo } from '@products/schemas/promos.schema';
import { PromosValidationService } from './errors/promos.spec';

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
    private readonly promosValidationService: PromosValidationService,
  ) {}

  async findAll(filters: any = {}): Promise<Promo[]> {
    const query: any = { 'estado.descripcion': 'Vigente' };
    const projection = { 'contenido.producto': { $slice: 1 } };

    return this.promoModel
      .find(query, projection)
      .limit(Number(filters.limit))
      .skip(Number(filters.offset))
      .sort({ _id: 1 })
      .lean();
  }

  async createPromo(promo: Promo): Promise<{data: Promo, success: boolean, message: string}> {
    const validation = await this.promosValidationService.validatePromoPayload(promo);
    if (!validation.isValid) {
      return {
        data: null,
        success: false,
        message: validation.error.message,
      };
    }
    const result = await this.promoModel.create(promo);
    return {
      data: result,
      success: true,
      message: 'PROMO CREADA EXITOSAMENTE',
    };
  }
}
