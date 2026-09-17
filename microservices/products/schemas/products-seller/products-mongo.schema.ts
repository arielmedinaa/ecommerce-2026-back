import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductoMongoDocument = ProductoMongo & Document;

// Mismo esquema (sin validación estricta, a propósito) que esquemaProducto
// del ecommerce viejo (bd/conexion.js) — esta colección la lee todavía el
// storefront en producción (centralshop.com.py), así que el doc tiene que
// calzar exactamente con lo que ese proyecto espera, no con lo que nos
// convendría a nosotros.
@Schema({ timestamps: true, collection: 'productos' })
export class ProductoMongo {
  @Prop({ type: String, index: true })
  codigo: string;

  @Prop({ type: String })
  codigoBarra: string;

  @Prop({ type: Object })
  marca: { nombre: string; ruta: string } | null;

  @Prop({ type: String })
  modelo: string;

  @Prop({ type: String })
  nombre: string;

  @Prop({ type: String, index: true })
  ruta: string;

  @Prop({ type: String })
  descripcion: string;

  @Prop({ type: Number })
  venta: number;

  @Prop({ type: Number })
  costo: number;

  @Prop({ type: Number })
  precio: number;

  @Prop({ type: Number, default: 0 })
  cantidad: number;

  @Prop({ type: Number, default: 0 })
  descuento: number;

  @Prop({ type: Array, default: [] })
  categorias: { nombre: string; ruta: string }[];

  @Prop({ type: Array, default: [] })
  subcategorias: { nombre: string; ruta: string }[];

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
  proveedores: string[];

  // [{ variante, formato, url: { "1000":..,"600":..,"300":..,"100":..,"60":.. } }]
  // — misma forma que producto.js/almacen.js del ecommerce viejo.
  @Prop({ type: Array, default: [] })
  imagenes: any[];

  @Prop({ type: String, default: '' })
  imagen: string;

  @Prop({ type: String, default: '' })
  sello: string;

  @Prop({ type: Number, default: 0 })
  dias_ultimo_movimiento: number;

  @Prop({ type: Number, default: 0 })
  web: number;

  @Prop({ type: Number, default: 0 })
  websc: number;

  @Prop({ type: Number, default: 1 })
  prioridad: number;

  @Prop({ type: Number, default: 0 })
  orden: number;

  @Prop({ type: Number, default: 1 })
  tipo: number;

  @Prop({ type: Number, default: 0 })
  estado: number;

  @Prop({ type: String })
  deposito: string;
}

export const ProductoMongoSchema = SchemaFactory.createForClass(ProductoMongo);

// Unico parcial: solo sobre los codigos de proveedor (prefijo "SEL-"), para
// no chocar con codigos duplicados preexistentes del catalogo ERP regular
// (esa coleccion "productos" es compartida con el ecommerce viejo y ya
// tenia cientos de duplicados de origen ERP antes de que este sync
// existiera). Evita que un mismo codigo_articulo de proveedor termine
// insertado dos veces en vez de actualizado.
ProductoMongoSchema.index(
  { codigo: 1 },
  {
    unique: true,
    name: 'codigo_seller_unique',
    partialFilterExpression: { codigo: { $gte: 'SEL-', $lt: 'SEL.' } },
  },
);
