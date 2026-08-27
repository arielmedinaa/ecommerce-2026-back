import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('cart_screenshots')
@Index(['cartCodigo'])
export class CartScreenshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cartCodigo: string;

  @Column()
  imageUrl: string;

  @Column()
  imageKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
