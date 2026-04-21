import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { TipoDescuento } from '../cupon.schema';

export class CreateCuponDto {
  @IsString()
  codigo: string;

  @IsString()
  descripcion?: string;

  @IsEnum(TipoDescuento)
  tipoDescuento: TipoDescuento;

  @IsNumber()
  @Min(0)
  valorDescuento: number;

  @IsNumber()
  @Min(0)
  porcentajeDescuento: number;

  @IsNumber()
  @Min(0)
  montoMinimoCompra?: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsNumber()
  @Min(0)
  limiteUsos: number;

  @IsNumber()
  @Min(0)
  limiteUsuario: number;

  @IsBoolean()
  activo: boolean;
}
