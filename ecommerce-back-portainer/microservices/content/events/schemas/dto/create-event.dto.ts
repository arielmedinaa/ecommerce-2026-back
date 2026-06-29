import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class EventProductDto {
  @IsString()
  producto_codigo: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limitePorUsuario?: number;

  @IsOptional()
  @IsNumber()
  precioOferta?: number;
}

export class CreateEventDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsBoolean()
  activo: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limiteGlobalPorUsuario?: number;

  @IsOptional()
  @IsString()
  beneficioUsuarioEspecifico?: string;

  @IsOptional()
  @IsNumber()
  prioridad?: number;

  @IsOptional()
  @IsNumber()
  idEventoPadre?: number;

  @IsOptional()
  @IsNumber()
  idPromo?: number;

  @IsOptional()
  @IsNumber()
  idCupon?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventProductDto)
  productos?: EventProductDto[];
}
