import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre' })
  nombre: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  password_hash: string | null;

  @Column({ name: 'ruc', nullable: true })
  ruc: string | null;

  @Column({ name: 'telefono', nullable: true })
  telefono: string | null;

  @Column({ name: 'direccion', nullable: true })
  direccion: string | null;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  @Column({ name: 'terminos_aceptados', default: false })
  terminos_aceptados: boolean;

  @Column({ name: 'terminos_aceptados_at', type: 'datetime', precision: 6, nullable: true })
  terminos_aceptados_at: Date | null;

  @Column({ name: 'primer_login_at', type: 'datetime', precision: 6, nullable: true })
  primer_login_at: Date | null;

  @Column({ name: 'ultimo_login_at', type: 'datetime', precision: 6, nullable: true })
  ultimo_login_at: Date | null;

  @Column({ name: 'primera_carga_productos_at', type: 'datetime', precision: 6, nullable: true })
  primera_carga_productos_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
