import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ProductoMongoDocument = ProductoMongo & Document;

@Schema({ _id: false })
export class CategoriaEmbebida {
  @Prop({ type: String, required: true })
  nombre: string;

  @Prop({ type: String, required: true })
  ruta: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;
}

const CategoriaEmbebidaSchema = SchemaFactory.createForClass(CategoriaEmbebida);

@Schema({ timestamps: true, collection: 'productos' })
export class ProductoMongo {
  @Prop({ type: String, required: true, index: true })
  codigo: string;

  @Prop({ type: String })
  codigoBarra: string;

  @Prop({ type: String })
  marca: string;

  @Prop({ type: String, required: true })
  nombre: string;

  @Prop({ type: String })
  descripcion: string;

  @Prop({ type: Number })
  costo: number;

  @Prop({ type: Number, required: true })
  precio: number;

  @Prop({ type: Number, default: 0 })
  cantidad: number;

  @Prop({ type: [CategoriaEmbebidaSchema], default: [] })
  categorias: CategoriaEmbebida[];

  @Prop({ type: [CategoriaEmbebidaSchema], default: [] })
  subcategorias: CategoriaEmbebida[];

  @Prop({ type: [String], default: [] })
  imagenes: string[];

  @Prop({ type: String })
  deposito: string;

  @Prop({ type: Number, default: 0 })
  estado: number;

  @Prop({ type: Array, default: [] })
  proveedores: any[];
}

export const ProductoMongoSchema = SchemaFactory.createForClass(ProductoMongo);
