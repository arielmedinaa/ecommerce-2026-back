import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ nullable: true, length: 255 })
  descripcion: string;

  @Column({ type: 'simple-array', nullable: true })
  modulos: string[];

  @Column({ default: false })
  esSistema: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
