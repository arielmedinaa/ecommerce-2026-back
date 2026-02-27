import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LlaveDocument = Llave & Document;

@Schema({ collection: 'llaves' })
export class Llave {
  @Prop({ required: true, unique: true })
  tabla: string;

  @Prop({ required: true, default: 0 })
  valor: number;
}

export const LlaveSchema = SchemaFactory.createForClass(Llave);
