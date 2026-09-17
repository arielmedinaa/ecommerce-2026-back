import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('products_sellers_columnas_activas')
@Index(['id_proveedor'])
@Unique(['id_proveedor', 'columna'])
export class ProductsSellerColumnaActiva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'columna' })
  columna: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
