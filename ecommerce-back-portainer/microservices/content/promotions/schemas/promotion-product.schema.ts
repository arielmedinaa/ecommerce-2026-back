import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('promociones_productos')
@Unique(['promoId', 'producto_codigo'])
export class PromotionProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  promoId: number;

  @Index()
  @Column({ length: 64 })
  producto_codigo: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  soldCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

