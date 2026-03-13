import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('combos')
export class Combo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  codigo: string;

  @Column({ nullable: true })
  codigoBarra: string;

  @Column({ type: 'json', nullable: true })
  marca: any;

  @Column({ nullable: true })
  modelo: string;

  @Column()
  nombre: string;

  @Column()
  ruta: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  venta: number;

  @Column({ type: 'json', nullable: true })
  ventaCredito: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'json', nullable: true })
  categorias: any;

  @Column({ type: 'json', nullable: true })
  subcategorias: any;

  @Column({ type: 'json', nullable: true })
  caracteristicas: any;

  @Column({ type: 'json', nullable: true })
  clasificaciones: any;

  @Column({ type: 'json', nullable: true })
  relaciones: any;

  @Column({ type: 'json', nullable: true })
  ofertas: any;

  @Column({ type: 'json', nullable: true })
  promos: any;

  @Column({ type: 'json', nullable: true })
  proveedores: any;

  @Column({ type: 'json', nullable: true })
  imagenes: any;

  @Column({ nullable: true })
  sello: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  dias_ultimo_movimiento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  web: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  websc: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prioridad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  orden: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tipo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  estado: number;

  @Column({ default: 'Central Shop' })
  deposito: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
