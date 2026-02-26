import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from 'mongoose';

export type BannersDocument = Banners & Document;

@Schema({
    timestamps: true,
    collection: 'banners'
})
export class Banners {
    @Prop({required: true, unique: true, trim: true})
    nombre: string;

    @Prop({required: true}) 
    imagen: string;

    @Prop({required: true}) 
    variante: string;

    @Prop({required: true, default: 'webp'})
    formato: string;

    @Prop({required: true})
    ruta: string;

    @Prop({required: true})
    estado: string;
    
    @Prop({required: true})
    creadoPor: string;
    
    @Prop({required: true})
    modificadoPor: string;
}

export const BannersSchema = SchemaFactory.createForClass(Banners);

BannersSchema.index({ creadoPor: 1 });
BannersSchema.index({ modificadoPor: 1 });
BannersSchema.index({ createdAt: -1 });
BannersSchema.index({ updatedAt: -1 });