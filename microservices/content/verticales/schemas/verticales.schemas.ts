import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Timestamp,
  CreateDateColumn,
} from 'typeorm';

@Entity('verticales')
export class Vertical {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  url: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Timestamp;

  @Column({ nullable: true })
  updated_by: string;

  @Column({ nullable: true })
  updated_at: Timestamp;
}
