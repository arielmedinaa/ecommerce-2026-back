import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Regla "viva" de sello por filtro: en vez de subir el sello producto por
// producto, se define un filtro (categoría/marca/proveedor/precio) y un cron
// (SellosReglasService) mantiene sincronizado productos_sello con los
// artículos que matchean ese filtro en cada momento.
@Entity('sellos_reglas')
export class SellosRegla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre', nullable: true })
  nombre: string | null;

  @Column({ name: 'filtro_categoria', nullable: true })
  filtro_categoria: string | null;

  @Column({ name: 'filtro_marca', nullable: true })
  filtro_marca: string | null;

  @Column({ name: 'filtro_proveedor', nullable: true })
  filtro_proveedor: string | null;

  @Column({ name: 'filtro_precio_min', type: 'decimal', precision: 14, scale: 2, nullable: true })
  filtro_precio_min: number | null;

  @Column({ name: 'filtro_precio_max', type: 'decimal', precision: 14, scale: 2, nullable: true })
  filtro_precio_max: number | null;

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

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'updated_by', nullable: true })
  updated_by: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
