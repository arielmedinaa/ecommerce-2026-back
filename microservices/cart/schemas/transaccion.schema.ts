

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransaccionDocument = Transaccion & Document;

@Schema({ timestamps: true, collection: 'transacciones' })
export class Transaccion {
  @Prop({ type: Number })
  codigo: number;
  
  @Prop({ type: Number })
  carrito: number;
  
  @Prop({ type: Date })
  tiempo: Date;
  
  @Prop({ type: Number })
  estado: number;
}

export const TransaccionSchema = SchemaFactory.createForClass(Transaccion);