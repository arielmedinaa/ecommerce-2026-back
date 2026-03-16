import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  proveedor: string;

  @Column()
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

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
