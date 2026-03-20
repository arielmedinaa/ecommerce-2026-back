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

  @IsOptional()
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoMinimoCompra?: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteUsos?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
