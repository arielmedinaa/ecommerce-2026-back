import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('products_excel_historial_detalle')
@Index(['id_historial_excel'])
export class ProductsExcelHistorialDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_historial_excel' })
  id_historial_excel: number;

  @Column({ name: 'fila', type: 'int' })
  fila: number;

  @Column({ name: 'aceptado', type: 'boolean' })
  aceptado: boolean;

  @Column({ name: 'codigo_articulo', nullable: true })
  codigo_articulo: string | null;

  @Column({ name: 'codigo_error', type: 'int', nullable: true })
  codigo_error: number | null;

  @Column({ name: 'motivo', nullable: true })
  motivo: string | null;

  @Column({ name: 'solucion', type: 'text', nullable: true })
  solucion: string | null;

  @Column({ name: 'datos_fila', type: 'text', nullable: true })
  datos_fila: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
