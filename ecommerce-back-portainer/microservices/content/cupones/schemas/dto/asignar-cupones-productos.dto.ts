import { IsArray, IsNotEmpty, ValidateNested, IsNumber, IsString, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CuponProductoItemDTO {
  @IsNumber()
  cuponId: number;

  @IsString()
  codigoCupon: string;

  @IsNumber()
  productoId: number;

  @IsString()
  codigoProducto: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteUsos?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class AsignarCuponesProductosDTO {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CuponProductoItemDTO)
  productos: CuponProductoItemDTO[];
}
