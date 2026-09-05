import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Tope alineado con MAX_CODIGOS en products.service.ts#getProductsByCodigos.
// Si se cambia uno, hay que actualizar el otro.
export class GetProductsByCodigosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  codigos: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
