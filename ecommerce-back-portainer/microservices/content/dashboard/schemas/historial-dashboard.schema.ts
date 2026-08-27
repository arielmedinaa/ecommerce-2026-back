import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Snapshot diario de las métricas del dashboard, capturado a las 00:00
// hora Paraguay (cierre del día anterior). Guarda tanto el monto/porcentaje
// marginal de ESE día (para comparar "qué día generó más") como el
// acumulado mes-a-la-fecha al cierre de ese día con su avance de meta
// (para comparar "qué mes ganó").
@Entity('dashboard_historial_diario')
export class HistorialDashboard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  fecha: string;

  @Column({
    name: 'facturado_dia_ecommerce',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  facturado_dia_ecommerce: number;

  @Column({
    name: 'facturado_dia_total_empresa',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  facturado_dia_total_empresa: number;

  @Column({
    name: 'porcentaje_ecommerce_dia',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  porcentaje_ecommerce_dia: number;

  @Column({
    name: 'facturado_mes_acumulado_ecommerce',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  facturado_mes_acumulado_ecommerce: number;

  @Column({
    name: 'facturado_mes_acumulado_total_empresa',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  facturado_mes_acumulado_total_empresa: number;

  @Column({
    name: 'porcentaje_ecommerce_mes',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  porcentaje_ecommerce_mes: number;

  @Column({ name: 'meta_mensual', type: 'decimal', precision: 15, scale: 2, default: 0 })
  meta_mensual: number;

  @Column({
    name: 'porcentaje_meta_alcanzado',
    type: 'decimal',
    precision: 7,
    scale: 2,
    default: 0,
  })
  porcentaje_meta_alcanzado: number;

  @Column({ name: 'cumple_meta_ecommerce', type: 'boolean', default: false })
  cumple_meta_ecommerce: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
