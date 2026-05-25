import { IsOptional, IsString } from 'class-validator';

export class AddProductToPromotionDto {
  @IsString()
  promoId: string;

  @IsString()
  producto_codigo: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

