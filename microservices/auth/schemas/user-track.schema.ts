import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Tipos de evento de seguimiento del usuario en el storefront.
export type UserTrackTipo =
  | 'LINK_VISIT'
  | 'LOGIN'
  | 'CART'
  | 'PROMO_VIEW'
  | 'OFERTA_VIEW'
  | 'PAGE_VISIT'
  | 'PRODUCT_VIEW';

// Log crudo de eventos por usuario (retención 30 días, purga periódica).
// Modelado sobre PromotionVisit del microservicio content.
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

  // Datos del evento: { href, promoId, ofertaId, familiaId, tipoProducto,
  // codigo, nombre, cartSnapshot, ... }
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
