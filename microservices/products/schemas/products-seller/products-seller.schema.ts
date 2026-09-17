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

  /** Costo que declara el proveedor en su excel. Es el dato de entrada. */
  @Column({ name: 'costo', type: 'decimal', precision: 15, scale: 2, nullable: true })
  costo: number | null;

  /**
   * Precio al que se publica en el ecommerce. Lo calculamos nosotros:
   * costo * (1 + recargo/100), con el recargo del ERP según subfamilia/familia.
   * El proveedor no lo elige — en su panel es de solo lectura.
   */
  @Column({ name: 'precioventa', type: 'decimal', precision: 15, scale: 2 })
  precioventa: number;

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

  @Column({ name: 'deposito', nullable: true })
  deposito: string | null;

  @Column({ name: 'disponible_retiro_inmediato', type: 'boolean', nullable: true })
  disponible_retiro_inmediato: boolean | null;

  @Column({ name: 'tiempo_preparacion_horas', type: 'int', nullable: true })
  tiempo_preparacion_horas: number | null;

  @Column({ name: 'peso_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  peso_kg: number | null;

  @Column({ name: 'dimensiones_cm', nullable: true })
  dimensiones_cm: string | null;

  @Column({ name: 'garantia_meses', type: 'int', nullable: true })
  garantia_meses: number | null;

  @Column({ name: 'condicion_producto', nullable: true })
  condicion_producto: string | null;

  @Column({ name: 'video_url', nullable: true })
  video_url: string | null;

  @Column({ name: 'ficha_tecnica_url', nullable: true })
  ficha_tecnica_url: string | null;

  @Column({ name: 'color_variante', nullable: true })
  color_variante: string | null;

  @Column({ name: 'unidad_venta', nullable: true })
  unidad_venta: string | null;

  @Column({ name: 'observaciones_proveedor', type: 'text', nullable: true })
  observaciones_proveedor: string | null;

  @Column({ name: 'erp_articulo_match', nullable: true })
  erp_articulo_match: string | null;

  @Column({ name: 'erp_match_score', type: 'int', nullable: true })
  erp_match_score: number | null;

  @Column({ name: 'erp_match_status', default: 'sin_match' })
  erp_match_status: string;

  @Column({ name: 'erp_match_motivo', nullable: true })
  erp_match_motivo: string | null;

  @Column({ name: 'erp_match_evaluado_at', type: 'datetime', nullable: true })
  erp_match_evaluado_at: Date | null;
}
