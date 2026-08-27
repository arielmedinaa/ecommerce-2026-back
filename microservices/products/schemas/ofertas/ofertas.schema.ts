import { Schema } from '@nestjs/mongoose';
import { Prop, SchemaFactory } from '@nestjs/mongoose';

class ProductoOferta {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  codigo: string;

  @Prop()
  tiempoActivo: number;

  @Prop({ type: Number })
  descuento: number;

  @Prop({ required: true, type: Number })
  precioContado: number;

  @Prop({ required: true, type: Number })
  precioCredito: number;

  @Prop([{
    cantidad: { type: Number, required: true },
    valor: { type: Number, required: true }
  }])
  cuotas: Array<{
    cantidad: number;
    valor: number;
  }>;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ default: 0 })
  prioridad: number;
}

@Schema({
  timestamps: true,
  collection: 'ofertas',
  autoIndex: true
})
export class Ofertas {
  @Prop({ type: [ProductoOferta], validate: {
    validator: function(v: ProductoOferta[]) {
      return v.length <= 12;
    },
    message: 'El array de productos no puede tener más de 12 elementos'
  }})
  productos: ProductoOferta[];

  @Prop({ required: true, type: Number })
  tiempoActivo: number;

  @Prop({ default: true })
  activo: boolean;
}

export const OfertasSchema = SchemaFactory.createForClass(Ofertas);

OfertasSchema.index({ activo: 1, tiempoActivo: 1 });