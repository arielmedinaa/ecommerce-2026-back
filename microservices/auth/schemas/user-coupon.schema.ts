import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.schemas';

// Un usuario solo puede tener una vez un mismo cupón: garantía a nivel DB para que
// sea imposible duplicar la asignación aun con concurrencia.
@Index('uq_user_cupon', ['userId', 'idCupon'], { unique: true })
@Entity('usuarios_cupones')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  userId: User;

  @Column()
  idCupon: number;

  @Column({ length: 255 })
  descripcion: string;

  @Column({ length: 100, nullable: true })
  eventId?: string;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
