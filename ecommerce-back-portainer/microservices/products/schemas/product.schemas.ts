import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity('articulo')
export class Product {
  @Column({ unique: true, nullable: true })
  codigo: string;

  @PrimaryColumn()
  codigo_articulo: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  familia: string;

  @Column({ nullable: true })
  subfamilia: string;

  @Column({ nullable: true })
  unidad: string;

  @Column({ nullable: true })
  proveedor: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  preciocosto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioventa: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  impuesto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximo: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ default: false })
  baja: boolean;

  @Column({ nullable: true })
  foto: string;

  @Column({ default: false })
  balanza: boolean;

  @Column({ nullable: true })
  nombret: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  recargo: number;

  @Column({ default: true })
  actualiza: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  may_can: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  may_por: number;

  @Column({ nullable: true })
  act1: string;

  @Column({ nullable: true })
  act2: string;

  @Column({ nullable: true })
  act3: string;

  @Column({ nullable: true })
  act4: string;

  @Column({ nullable: true })
  act5: string;

  @Column({ nullable: true })
  ctacompra: string;

  @Column({ nullable: true })
  ctaventa: string;

  @Column({ nullable: true })
  ctacosven: string;

  @Column({ default: false })
  insumo: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costofinal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  preciotope: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  recargosug: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  oferta_desde: Date;

  @Column({ nullable: true })
  oferta_hasta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oferta_porce: number;

  @Column({ default: false })
  cambioprecio: boolean;

  @Column({ nullable: true })
  tipo_producto: string;

  @Column({ nullable: true })
  ctaimporta: string;

  @Column({ default: false })
  medidor: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  moneda1: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  moneda2: number;

  @Column({ nullable: true })
  codigodebarra: string;

  @Column({ nullable: true })
  marca: string;

  @Column({ default: false })
  web: boolean;

  @Column({ default: false })
  websc: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  desmax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stock2: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  peso: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  largo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ancho: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  alto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumen: number;

  @Column({ nullable: true })
  gestion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valoracion: number;

  @Column({ nullable: true })
  codigo_articulo_proveedor: string;

  @Column({ nullable: true })
  numero_serie: string;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;
}
