import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventProduct } from './event-product.schema';
import { Vertical } from '@content/verticales/schemas/verticales.schemas';
import { Landing } from '@content/landings/schemas/landings.schemas';
import { EventCondition } from './event-condition.schema';

@Entity('eventos')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  @Column({ type: 'timestamp' })
  fechaFin: Date;

  @Column({ default: true })
  activo: boolean;

  // Límite global de compras por usuario para productos en este evento (null = sin límite global)
  @Column({ type: 'int', nullable: true })
  limiteGlobalPorUsuario: number;

  // Beneficio específico para usuarios (Identificacion por token)
  @Column({ type: 'text', nullable: true })
  beneficioUsuarioEspecifico?: string;

  // Prioridad para resolver conflictos (mayor número = mayor prioridad)
  @Column({ type: 'int', default: 0 })
  prioridad: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EventProduct, (eventProduct) => eventProduct.evento)
  eventProducts?: EventProduct[];

  @OneToMany(() => EventCondition, (condition) => condition.evento)
  conditions?: EventCondition[];

  @Column({ nullable: true })
  idEventoPadre?: number;

  @ManyToOne(() => Event, (event) => event.subEventos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idEventoPadre' })
  eventoPadre?: Event;

  @OneToMany(() => Event, (event) => event.eventoPadre, { onDelete: 'CASCADE' })
  subEventos?: Event[];

  @Column({ default: 0, nullable: true, type: 'int' })
  idPromo?: number;

  @OneToMany(() => Vertical, (vertical) => vertical.id)
  idVerticales?: Vertical[];

  @OneToMany(() => Landing, (landing) => landing.id)
  idLandings?: Landing[];
}
