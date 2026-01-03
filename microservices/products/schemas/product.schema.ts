import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'productos' })
export class Product {
  @Prop({ type: String })
  codigo: string;

  @Prop({ type: String })
  codigoBarra: string;

  @Prop({ type: Object })
  marca: Record<string, any>;

  @Prop({ type: String })
  modelo: string;

  @Prop({ type: String, required: true })
  nombre: string;

  @Prop({ type: String })
  ruta: string;

  @Prop({ type: String })
  descripcion: string;

  @Prop({ type: Number })
  venta: number;

  @Prop({ type: Number })
  costo: number;

  @Prop({ type: Number, required: true })
  precio: number;

  @Prop({ type: Number, default: 0 })
  cantidad: number;

  @Prop({ type: Number, default: 0 })
  descuento: number;

  @Prop({ type: Array, default: [] })
  categorias: any[];

  @Prop({ type: Array, default: [] })
  subcategorias: any[];

  @Prop({ type: Array, default: [] })
  caracteristicas: any[];

  @Prop({ type: Array, default: [] })
  clasificaciones: any[];

  @Prop({ type: Array, default: [] })
  relaciones: any[];

  @Prop({ type: Array, default: [] })
  ofertas: any[];

  @Prop({ type: Array, default: [] })
  promos: any[];

  @Prop({ type: Array, default: [] })
  proveedores: any[];

  @Prop({ type: [String], default: [] })
  imagenes: string[];

  @Prop({ type: String })
  imagen: string;

  @Prop({ type: String })
  sello: string;

  @Prop({ type: Number, default: 0 })
  dias_ultimo_movimiento: number;

  @Prop({ type: Number, default: 0 })
  web: number;

  @Prop({ type: Number, default: 0 })
  websc: number;

  @Prop({ type: Number, default: 0 })
  prioridad: number;

  @Prop({ type: Number, default: 0 })
  orden: number;

  @Prop({ type: Number, default: 0 })
  tipo: number;

  @Prop({ type: Number, default: 1 })
  estado: number;

  @Prop({ type: String })
  deposito: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);