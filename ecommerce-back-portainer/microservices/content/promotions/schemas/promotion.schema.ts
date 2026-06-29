import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PromotionBannerDimension = {
  fileName: string;
  filePath?: string;
  width: number;
  height: number;
  url: string;
};

export type PromotionBannerRef = {
  bannerId: string;
  nombre: string;
  variante: string;
  formato?: string;
  dimensiones?: Record<string, PromotionBannerDimension>;
  meta?: Record<string, any>;
};

@Entity('promociones')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  @Column({ type: 'timestamp' })
  fechaFin: Date;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', nullable: true })
  landingId?: number;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  url?: string;

  @Column('json', { nullable: true })
  banners?: PromotionBannerRef[];

  @Column({ type: 'int', nullable: true })
  eventId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
