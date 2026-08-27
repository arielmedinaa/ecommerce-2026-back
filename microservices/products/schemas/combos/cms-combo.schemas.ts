import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CmsComboDetalle } from './cms-combo-detalle.schemas';

@Entity('cms_combos')
export class CmsCombo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioVenta: number;

  @Column({ nullable: true })
  imagen?: string;

  @Column({ length: 255, nullable: true })
  categoria?: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaDesde: Date | null;

  @Column({ type: 'datetime', nullable: true })
  fechaHasta: Date | null;

  @Column({ length: 255, nullable: true })
  createdBy?: string;

  @Column({ length: 255, nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CmsComboDetalle, detalle => detalle.combo, { cascade: true })
  detalles: CmsComboDetalle[];
}
