import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Llave } from '../../schemas/llave.schema';

@Injectable()
export class ObtenerClaveService {
  constructor(
    @InjectModel(Llave.name) private readonly llaveModel: Model<Llave>,
  ) {}

  async obtenerClave(tabla: string): Promise<number> {
    const llave = await this.llaveModel.findOne({ tabla });
    
    if (!llave) {
      const newKey = new this.llaveModel({ tabla, valor: 1 });
      await newKey.save();
      return 1;
    }
    
    llave.valor += 1;
    await llave.save();
    return llave.valor;
  }
}
