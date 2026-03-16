import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pagos')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo_carrito' })
  codigoCarrito: number;

  @Column({ type: 'json', default: '{}' })
  carrito: Record<string, any>;

  @Column({ type: 'varchar', length: 20 })
  estado: string;

  @Column({ type: 'varchar', length: 50 })
  metodoPago: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 10, default: 'PYG' })
  moneda: string;

  @Column({ type: 'json', default: '{}' })
  respuestaPagopar: {
    idPago?: string;
    estado?: string;
    urlProceso?: string;
    codigoQr?: string;
    fechaExpiracion?: string;
    respuesta?: any;
  };

  @Column({ type: 'json', default: '{}' })
  respuestaBancard: {
    idPago?: string;
    estado?: string;
    codigoAutorizacion?: string;
    numeroTicket?: string;
    respuesta?: any;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  idTransaccion: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'json', default: '{}' })
  cliente: {
    equipo: string;
    nombre: string;
    email: string;
    telefono?: string;
    documento: string;
    nroDocumento: string;
  };

  @Column({ type: 'json', default: '{}' })
  metadatos: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  finalizado: Date;

  @Column({ type: 'text', nullable: true })
  motivoFallo: string;

  @Column({ type: 'int', default: 0 })
  intentosReintentar: number;

  @Column({ type: 'datetime', nullable: true })
  proximoReintento: Date;

  @Column({ type: 'json', default: '[]' })
  reembolsos: Array<{
    monto: number;
    motivo: string;
    fecha: Date;
    estado: string;
    idReembolso?: string;
  }>;

  @Column({ type: 'datetime', nullable: true })
  procesado: Date;

  @Column({ type: 'datetime', nullable: true })
  expira: Date;

  @Column({ type: 'boolean', default: false })
  finalizadoFlag: boolean;

  @Column({ type: 'boolean', default: false })
  procesadoFlag: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
