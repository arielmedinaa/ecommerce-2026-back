import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.schema';

@Entity('ordenes_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (orden) => orden.items)
  @JoinColumn({ name: 'orden_id' })
  orden: Order;

  @Column()
  orden_id: number;

  @Column()
  producto_codigo: string;

  @Column()
  producto_nombre: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'int', nullable: true })
  evento_id: number;

  @CreateDateColumn()
  fecha_creacion: Date;
}
