import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('promociones_visitas')
export class PromotionVisit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  promoId: number;

  @Index()
  @Column({ length: 64 })
  userId: string;

  @CreateDateColumn()
  visitedAt: Date;
}

