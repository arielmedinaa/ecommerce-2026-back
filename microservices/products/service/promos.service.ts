import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promo } from '@products/schemas/promos.schema';

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
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
}
