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

  // Código o ID del producto (referencia externa al microservicio de productos)
  @Column({ length: 50 })
  producto_codigo: string;

  // Límite específico por usuario para este producto en el evento (null = usar límite global del evento)
  @Column({ type: 'int', nullable: true })
  limitePorUsuario: number;

  // Precio especial durante el evento (null = usar precio normal)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioOferta?: number;

  @CreateDateColumn()
  createdAt: Date;
}
