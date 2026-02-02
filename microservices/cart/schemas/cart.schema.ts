import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ timestamps: true, collection: 'carritos' })
export class Cart {
  @Prop({ type: Number, required: true })
  codigo: number;

  @Prop({ type: String, required: true })
  proceso: string;

  @Prop({ type: Object, required: true })
  cliente: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  tiempo: Date;

  @Prop({ type: Array, default: [] })
  transaccion: any[];

  @Prop({ type: Array, default: [] })
  seguimiento: any[];

  @Prop({ type: Object, default: {} })
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
}

export const CartSchema = SchemaFactory.createForClass(Cart);
