import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type PromoDocument = Promo & Document;

@Schema({ timestamps: true, collection: 'promos' })
export class Promo {
    @Prop({ type: String })
    codigo: string;

    @Prop({ type: String })
    nombre: string;

    @Prop({ type: String })
    descripcion: string;

    @Prop({ type: String })
    ruta: string;

    @Prop({ type: String })
    fecha: string;

    @Prop({ type: String })
    hora: string;

    @Prop({ type: Object })
    tiempo: Object;

    @Prop({ type: Object })
    contenido: Object;

    @Prop({ type: Object })
    visibilidad: Object;

    @Prop({ type: Object })
    configuracion: Object;

    @Prop({ type: Object })
    estado: Object;

    @Prop({ type: Number, default: 0 })
    cantidadCliente: Number;
}

export const PromoSchema = SchemaFactory.createForClass(Promo);