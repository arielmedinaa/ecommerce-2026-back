import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('banners')
@Index(['creadoPor'])
@Index(['modificadoPor'])
@Index(['createdAt'])
@Index(['updatedAt'])
export class Banners {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @Column()
  imagen: string;

  @Column()
  variante: string;

  @Column({ default: 'webp' })
  formato: string;

  @Column()
  ruta: string;

  @Column()
  estado: string;

  @Column('json', { nullable: true })
  dimensiones: any;

  @Column()
  creadoPor: string;

  @Column()
  modificadoPor: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}