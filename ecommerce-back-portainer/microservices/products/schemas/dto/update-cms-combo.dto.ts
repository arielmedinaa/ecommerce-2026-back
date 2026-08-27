import { CmsComboDetalleDto } from './create-cms-combo.dto';

export interface UpdateCmsComboDto {
  nombre?: string;
  descripcion?: string;
  precioVenta?: number;
  imagen?: string;
  categoria?: string;
  activo?: boolean;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  updatedBy?: string;
  detalles?: CmsComboDetalleDto[];
}
