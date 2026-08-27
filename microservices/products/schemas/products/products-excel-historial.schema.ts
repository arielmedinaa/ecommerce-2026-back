import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('products_excel_historial')
@Index(['id_proveedor'])
export class ProductsExcelHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'nombre_archivo_original' })
  nombre_archivo_original: string;

  // Clave del objeto en S3/LocalStack; null si el guardado del archivo falló
  // (no bloquea el import, es solo auditoría/historial).
  @Column({ name: 'storage_key', nullable: true })
  storage_key: string | null;

  @Column({ name: 'total_filas', type: 'int', default: 0 })
  total_filas: number;

  @Column({ name: 'aceptados', type: 'int', default: 0 })
  aceptados: number;

  @Column({ name: 'rechazados', type: 'int', default: 0 })
  rechazados: number;

  // procesando | completado | error — controla el polling del frontend.
  @Column({ name: 'estado', default: 'procesando' })
  estado: string;

  @Column({ name: 'procesados', type: 'int', default: 0 })
  procesados: number;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
