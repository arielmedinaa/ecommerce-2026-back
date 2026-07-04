import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductoOferta } from './producto-oferta.schemas';

@Entity('ofertas')
export class Oferta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tiempoActivo: number;

  @Column({ length: 255 })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy?: string;

  @Column({ default: true })
  activo: boolean;

  // Combos: si la oferta permite combinar sus artículos, y el % de descuento del combo.
  @Column({ default: false })
  combosHabilitado: boolean;

  @Column({ type: 'int', default: 0 })
  comboDescuento: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProductoOferta, productoOferta => productoOferta.oferta, { cascade: true })
  productos: ProductoOferta[];
}
