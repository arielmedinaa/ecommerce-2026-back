import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('productos_imagenes')
export class ProductsImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_codigo' })
  producto_codigo: string;

  @Column({ name: 'url_imagen' })
  url_imagen: string;

  @Column({ name: 'nombre_archivo', nullable: true })
  nombre_archivo: string;

  @Column({ name: 'orden', default: 0 })
  orden: number;

  @Column({ name: 'principal', default: false })
  principal: boolean;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'updated_by', nullable: true })
  updated_by: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
