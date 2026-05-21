import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type HomeSectionType =
  | 'HERO'
  | 'VERTICALES'
  | 'BANNERS'
  | 'OFERTAS'
  | 'JOTA'
  | 'PRODUCTOS';

@Entity('home_sections')
@Index(['activo', 'orden'])
@Index(['key'], { unique: true })
export class HomeSection {
  @PrimaryGeneratedColumn()
  id: number;

  // Identificador estable para referenciar desde el admin / frontend.
  @Column({ length: 80 })
  key: string;

  @Column({ type: 'varchar', length: 30 })
  type: HomeSectionType;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  titulo?: string;

  // Config libre por sección. Ej:
  // - BANNERS/HERO: { "variantes": ["hero"] }
  // - PRODUCTOS: { "limit": 12, "offset": 0 }
  // - JOTA: { "marca": "257", "limit": 12 }
  @Column({ type: 'json', nullable: true })
  config?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

