import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type UserTrackTipo =
  | 'LINK_VISIT'
  | 'LOGIN'
  | 'CART'
  | 'PROMO_VIEW'
  | 'OFERTA_VIEW'
  | 'PAGE_VISIT'
  | 'PRODUCT_VIEW';

@Entity('usuarios_seguimiento')
@Index(['userId', 'createdAt'])
@Index(['tipo'])
export class UserTrack {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 64 })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  tipo: UserTrackTipo;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
