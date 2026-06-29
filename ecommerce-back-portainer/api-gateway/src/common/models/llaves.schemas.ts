import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LlaveDocument = Llave & Document;

@Schema({ timestamps: true, collection: 'llaves' })
export class Llave {
    @Prop({ type: Number, required: true, unique: true })
    secuencia: number;

    @Prop({ type: String, required: true })
    tipo: string;

    @Prop({ type: String, default: '' })
    correo: string;
}

export const LlaveSchema = SchemaFactory.createForClass(Llave);