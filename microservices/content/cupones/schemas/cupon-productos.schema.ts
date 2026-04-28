import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Cupon } from './cupon.schema';

@Entity('cupones_por_producto')
export class CuponesPorProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  cuponId: number;

  @ManyToOne(() => Cupon)
  cupon: Cupon;

  @Column({ nullable: false })
  codigoCupon: string;

  @Column({ nullable: false })
  productoId: number;

  @Column({ nullable: false })
  codigoProducto: string;

  @Column({ default: 0 })
  limiteUsos: number;

  @Column({ default: true })
  activo: boolean;
}
