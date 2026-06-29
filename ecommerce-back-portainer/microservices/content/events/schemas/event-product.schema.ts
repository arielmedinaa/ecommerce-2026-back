import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './event.schema';

@Entity('eventos_productos')
export class EventProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event, (evento) => evento.eventProducts)
  @JoinColumn({ name: 'evento_id' })
  evento: Event;

  @Column()
  evento_id: number;

  @Column({ length: 50 })
  producto_codigo: string;

  @Column({ type: 'int', nullable: true })
  limitePorUsuario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioOferta?: number;

  @CreateDateColumn()
  createdAt: Date;
}
