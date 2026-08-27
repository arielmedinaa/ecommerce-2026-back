export interface CmsComboDetalleDto {
  codigoArticulo: string;
  nombreArticulo: string;
  cantidad: number;
}

export interface CreateCmsComboDto {
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  imagen?: string;
  categoria?: string;
  activo?: boolean;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  createdBy?: string;
  detalles: CmsComboDetalleDto[];
}
