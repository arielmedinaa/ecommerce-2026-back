import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ timestamps: true, collection: 'carritos' })
export class Cart {
  @Prop({ type: Number, required: true })
  codigo: number;

  @Prop({ type: String })
  proceso: string;

  @Prop({
    type: Object,
    required: true,
    default: {
      equipo: '',
      razonsocial: '',
      correo: '',
      telefono: '',
      documento: '',
      tipodocumento: '',
    },
  })
  cliente: {
    equipo: string;
    razonsocial?: string;
    correo?: string;
    telefono?: string;
    documento?: string;
    tipodocumento?: string;
  };

  @Prop({ type: String })
  tiempo: string;

  @Prop({ type: Array, default: [] })
  transaccion: any[];

  @Prop({ type: Array, default: [] })
  seguimiento: any[];

  @Prop({
    type: Object,
    default: {
      direccion: '',
      numerocasa: '',
      ciudad: '',
      barrio: '',
      observacion: '',
      ubicacion: {
        latitud: -25.3084825,
        longitud: -57.5764874,
      },
    },
  })
  envio: Record<string, any>;

  @Prop({ type: Object, default: {} })
  pago: Record<string, any>;

  @Prop({ type: Object, default: {} })
  articulos: Record<string, any>;

  @Prop({ type: Number, default: 0 })
  atencion: number;

  @Prop({ type: Number, default: 1 })
  estado: number;

  @Prop({ type: Object, default: {} })
  estados: Record<string, any>;

  @Prop({ type: String })
  finished?: string;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
