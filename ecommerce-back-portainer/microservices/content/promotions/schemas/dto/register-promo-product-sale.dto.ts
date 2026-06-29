import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegisterPromoProductSaleDto {
  @IsString()
  promoId: string;

  @IsString()
  producto_codigo: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;
}

