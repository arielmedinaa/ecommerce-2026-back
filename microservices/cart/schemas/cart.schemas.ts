import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('carritos')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo: number;

  @Column({ nullable: true })
  proceso: string;

  @Column({ type: 'json', nullable: true })
  cliente: any;

  @Column({ nullable: true })
  tiempo: string;

  @Column({ type: 'json', nullable: true })
  transaccion: any;

  @Column({ type: 'json', nullable: true })
  seguimiento: any;

  @Column({ type: 'json', nullable: true })
  envio: any;

  @Column({ type: 'json', nullable: true })
  pago: any;

  @Column({ type: 'json', nullable: true })
  articulos: any;

  @Column()
  estado: string;

  @Column({ nullable: true })
  finished: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
