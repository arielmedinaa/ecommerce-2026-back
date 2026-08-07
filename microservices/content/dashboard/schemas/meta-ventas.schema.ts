import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('meta_ventas')
export class MetaVentas {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'monto_meta', type: 'decimal', precision: 15, scale: 2, default: 0 })
  monto_meta: number;

  @Column({ name: 'updated_by', nullable: true })
  updated_by: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
