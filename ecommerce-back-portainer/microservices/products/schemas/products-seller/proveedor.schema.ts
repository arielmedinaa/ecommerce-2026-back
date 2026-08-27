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

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
