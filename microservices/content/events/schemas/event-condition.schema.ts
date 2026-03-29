import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.schema';

export enum ConditionType {
  MIN_CARRITO = 'MIN_CARRITO',
  MAX_UNIDADES_PEDIDO = 'MAX_UNIDADES_PEDIDO',
  SOLO_NUEVOS_USUARIOS = 'SOLO_NUEVOS_USUARIOS',
  METODO_PAGO_ESPECIFICO = 'METODO_PAGO_ESPECIFICO',
}

@Entity('eventos_condiciones')
export class EventCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event, (evento) => evento.conditions)
  @JoinColumn({ name: 'evento_id' })
  evento: Event;

  @Column()
  evento_id: number;

  @Column({
    type: 'enum',
    enum: ConditionType,
  })
  tipo: ConditionType;

  @Column({ type: 'varchar', length: 255 })
  valor: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
