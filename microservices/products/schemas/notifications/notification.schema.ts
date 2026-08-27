import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// tipo: 'catalogo_pendiente' | 'producto_rechazado' | 'producto_aprobado'
// destinatario_tipo: 'admin' | 'provider'
@Entity('notifications')
@Index(['destinatario_tipo', 'id_proveedor'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipo' })
  tipo: string;

  @Column({ name: 'destinatario_tipo' })
  destinatario_tipo: string;

  // null cuando destinatario_tipo='admin' (notificación global para todos los admins)
  @Column({ name: 'id_proveedor', nullable: true })
  id_proveedor: number | null;

  @Column({ name: 'titulo' })
  titulo: string;

  @Column({ name: 'mensaje', type: 'text' })
  mensaje: string;

  @Column({ name: 'payload', type: 'json', nullable: true })
  payload: Record<string, any> | null;

  @Column({ name: 'leido', default: false })
  leido: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
