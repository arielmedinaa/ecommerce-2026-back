import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('stock_minimo_config')
@Index(['id_proveedor'])
export class StockMinimoConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'tipo' })
  tipo: 'familia' | 'producto' | 'fecha_carga';

  @Column({ name: 'codigo_familia', nullable: true })
  codigo_familia: string | null;

  @Column({ name: 'codigo_articulo', nullable: true })
  codigo_articulo: string | null;

  @Column({ name: 'fecha_desde', type: 'date', nullable: true })
  fecha_desde: string | null;

  @Column({ name: 'fecha_hasta', type: 'date', nullable: true })
  fecha_hasta: string | null;

  @Column({ name: 'stock_minimo', type: 'int' })
  stock_minimo: number;

  @Column({ name: 'stock_casi_bajo', type: 'int', nullable: true })
  stock_casi_bajo: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
