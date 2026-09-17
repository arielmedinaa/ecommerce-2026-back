import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('productos_sello')
export class ProductsSello {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_codigo', unique: true })
  producto_codigo: string;

  @Column({ name: 'url_sello' })
  url_sello: string;

  @Column({ name: 'nombre_archivo', nullable: true })
  nombre_archivo: string;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  @Column({ name: 'fecha_desde', type: 'datetime', nullable: true })
  fecha_desde: Date | null;

  @Column({ name: 'fecha_hasta', type: 'datetime', nullable: true })
  fecha_hasta: Date | null;

  @Column({ name: 'regla_id', type: 'int', nullable: true })
  regla_id: number | null;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'updated_by', nullable: true })
  updated_by: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
