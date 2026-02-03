import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CombosDocument = Combos & Document;

@Schema({
  timestamps: true,
  collection: 'combos',
})
export class Combos {
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

  @Prop({ type: String, required: true })
  ruta: string;

  @Prop({ type: String, required: true })
  descripcion: string;

  @Prop({ type: Number })
  venta: number;

  @Prop({ type: Array, default: [] })
  ventaCredito: any[];

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

  @Prop({ type: Array, default: [], required: true })
  caracteristicas: any[];

  @Prop({ type: Array, default: [], required: true })
  clasificaciones: any[];

  @Prop({ type: Array, default: [] })
  relaciones: any[];

  @Prop({ type: Array, default: [] })
  ofertas: any[];

  @Prop({ type: Array, default: [] })
  promos: any[];

  @Prop({ type: Array, default: [] })
  proveedores: any[];

  @Prop({ type: [String], default: [], required: true })
  imagenes: string[];

  @Prop({ type: String })
  sello: string;

  @Prop({ type: Number, default: 0 })
  dias_ultimo_movimiento: number;

  @Prop({ type: Number, default: 1 })
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

  @Prop({ type: String, default: 'Central Shop' })
  deposito: string;
}

export const CombosSchema = SchemaFactory.createForClass(Combos);
