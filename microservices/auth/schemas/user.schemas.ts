import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 500 })
  email: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  proveedor: string;

  @Column({ unique: true, length: 500 })
  idProveedor: string;

  @Column({ default: true })
  estaActivo: boolean;

  @Column({ type: 'datetime', nullable: true })
  ultimoInicioSesion: Date;

  @Column({ default: false })
  esInvitado: boolean;

  @Column({ type: 'json', nullable: true })
  infoDispositivo?: any;

  @Column({ type: 'datetime', nullable: true })
  fechaExpiracion?: Date;

  @Column({ type: 'simple-array', nullable: true, default: 'NUEVO_USUARIO' })
  etiquetas?: string[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;

  @Column({ default: 'NUEVO_USUARIO' })
  beneficioUsuario: string;
}
