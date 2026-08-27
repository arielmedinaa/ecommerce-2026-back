import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_subscriptions')
@Index(['destinatario_tipo', 'id_proveedor'])
export class PushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  // admin | provider
  @Column({ name: 'destinatario_tipo' })
  destinatario_tipo: string;

  @Column({ name: 'id_proveedor', nullable: true })
  id_proveedor: number | null;

  // Sin unique a nivel DB: los endpoints de push pueden superar el límite de
  // bytes indexables en InnoDB con utf8mb4. La unicidad se garantiza en el
  // servicio (busca por endpoint antes de insertar).
  @Column({ name: 'endpoint', type: 'text' })
  endpoint: string;

  @Column({ name: 'p256dh' })
  p256dh: string;

  @Column({ name: 'auth' })
  auth: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
