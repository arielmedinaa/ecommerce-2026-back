import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EstadoIntentoPago =
  | 'creado'
  | 'procesando'
  | 'completado'
  | 'fallido'
  | 'cancelado'
  | 'expirado';

@Entity('intentos_pago')
@Index(['idTransaccion'], { unique: true })
@Index(['codigoCarrito'])
@Index(['estado'])
export class PaymentIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_transaccion', type: 'varchar', length: 100 })
  idTransaccion: string;

  @Column({ name: 'codigo_carrito', type: 'int' })
  codigoCarrito: number;

  @Column({ type: 'varchar', length: 20 })
  estado: EstadoIntentoPago;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 50 })
  metodoPago: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 10, default: 'PYG' })
  moneda: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'json', default: '{}' })
  carrito: Record<string, any>;

  @Column({ type: 'json', default: '{}' })
  cliente: Record<string, any>;

  @Column({ type: 'json', default: '{}' })
  metadatos: Record<string, any>;

  @Column({ name: 'respuesta_pagopar', type: 'json', default: '{}' })
  respuestaPagopar: Record<string, any>;

  @Column({ name: 'respuesta_bancard', type: 'json', default: '{}' })
  respuestaBancard: Record<string, any>;

  @Column({ name: 'motivo_fallo', type: 'text', nullable: true })
  motivoFallo: string;

  @Column({ name: 'intentos_reintento', type: 'int', default: 0 })
  intentosReintento: number;

  @Column({ name: 'ultimo_error', type: 'text', nullable: true })
  ultimoError: string;

  @Column({ name: 'proximo_reintento', type: 'datetime', nullable: true })
  proximoReintento: Date;

  @Column({ name: 'expira_en', type: 'datetime', nullable: true })
  expiraEn: Date;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
