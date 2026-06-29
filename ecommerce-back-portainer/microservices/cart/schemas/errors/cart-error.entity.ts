import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('logs_carritos')
export class CartError {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cartId: string;

  @Column()
  errorCode: string;

  @Column()
  message: string;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  stackTrace?: string;

  @Column({ nullable: true })
  path?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
