import { IsBoolean, IsNumber, IsString, Min } from "class-validator";

export class CuponPorProductoDTO {
  @IsNumber()
  cuponId: number;

  @IsNumber()
  codigoCupon: string;

  @IsNumber()
  productoId: number;

  @IsString()
  codigoProducto: string;

  @IsNumber()
  @Min(0)
  limiteUsos: number;

  @IsBoolean()
  activo: boolean;
}
