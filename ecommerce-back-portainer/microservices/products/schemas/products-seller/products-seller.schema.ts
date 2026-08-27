import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('products_sellers')
@Index(['estado'])
@Index(['id_proveedor'])
export class ProductsSeller {
  @PrimaryGeneratedColumn()
  id: number;

  // Código interno generado por el sistema (prefijo SEL- + uuid corto), para
  // no colisionar con los codigo_articulo del ERP.
  @Column({ name: 'codigo_articulo', unique: true })
  codigo_articulo: string;

  // SKU propio del proveedor — solo referencia, no se valida contra nada.
  @Column({ name: 'codigo_proveedor_interno', nullable: true })
  codigo_proveedor_interno: string;

  @Column({ name: 'nombre_articulo' })
  nombre_articulo: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'codigo_marca', nullable: true })
  codigo_marca: string | null;

  @Column({ name: 'marca_texto_original', nullable: true })
  marca_texto_original: string;

  @Column({ name: 'marca_sugerida', nullable: true })
  marca_sugerida: string;

  @Column({ name: 'requiere_revision_marca', default: false })
  requiere_revision_marca: boolean;

  @Column({ name: 'codigo_categoria', nullable: true })
  codigo_categoria: string | null;

  @Column({ name: 'codigo_subcategoria', nullable: true })
  codigo_subcategoria: string | null;

  @Column({ name: 'requiere_revision_categoria', default: false })
  requiere_revision_categoria: boolean;

  @Column({ name: 'precioventa', type: 'decimal', precision: 15, scale: 2 })
  precioventa: number;

  @Column({ name: 'precio_sugerido', type: 'decimal', precision: 15, scale: 2, nullable: true })
  precio_sugerido: number | null;

  @Column({ name: 'codigo_de_barra', nullable: true })
  codigo_de_barra: string;

  @Column({ name: 'stock_actual', type: 'int', default: 0 })
  stock_actual: number;

  @Column({ name: 'imagen_1' })
  imagen_1: string;

  @Column({ name: 'imagen_2', nullable: true })
  imagen_2: string;

  @Column({ name: 'imagen_3', nullable: true })
  imagen_3: string;

  @Column({ name: 'imagen_4', nullable: true })
  imagen_4: string;

  @Column({ name: 'imagen_5', nullable: true })
  imagen_5: string;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'id_historial_excel', nullable: true })
  id_historial_excel: number | null;

  @Column({ name: 'estado', default: 'pendiente' })
  estado: string;

  @Column({ name: 'motivo_rechazo', nullable: true })
  motivo_rechazo: string;

  @Column({ name: 'codigo_rechazo', type: 'int', nullable: true })
  codigo_rechazo: number | null;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'updated_by', nullable: true })
  updated_by: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
