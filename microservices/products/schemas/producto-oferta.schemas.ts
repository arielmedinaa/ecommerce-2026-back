import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Oferta } from './oferta.schemas';

@Entity('producto_ofertas')
export class ProductoOferta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo_articulo: string;

  @Column()
  nombre_articulo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tiempoActivo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  descuento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioContado: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioCredito: number;

  @Column({ type: 'json', nullable: true })
  cuotas: any;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prioridad: number;

  @Column({ nullable: true })
  ofertaId: number;

  @ManyToOne(() => Oferta, oferta => oferta.productos, { nullable: true })
  @JoinColumn({ name: 'ofertaId' })
  oferta: Oferta;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
