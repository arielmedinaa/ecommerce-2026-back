import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoDescuento {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO',
}

@Entity('cupones')
export class Cupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'enum',
    enum: TipoDescuento,
    default: TipoDescuento.PORCENTAJE,
  })
  tipoDescuento: TipoDescuento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorDescuento: number;
  
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeDescuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoMinimoCompra: number;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  @Column({ type: 'timestamp' })
  fechaFin: Date;

  @Column({ default: 0 })
  limiteUsos: number;

  @Column({ default: 0 })
  usosActuales: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
