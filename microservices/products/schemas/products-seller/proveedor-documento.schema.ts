import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('proveedor_documentos')
export class ProveedorDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'nombre_archivo' })
  nombre_archivo: string;

  @Column({ name: 'content_type' })
  content_type: string;

  @Column({ name: 's3_key' })
  s3_key: string;

  @Column({ name: 'url' })
  url: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
