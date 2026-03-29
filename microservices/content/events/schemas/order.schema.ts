import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.schema';

@Entity('ordenes')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column()
  carrito_codigo: number;

  @Column()
  cliente_documento: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  evento_id: string;

  @Column({ type: 'json', nullable: true })
  datos_envio: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  datos_pago: Record<string, any>;

  @Column({ default: 1 })
  estado: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @OneToMany(() => OrderItem, (item) => item.orden)
  items: OrderItem[];
}
