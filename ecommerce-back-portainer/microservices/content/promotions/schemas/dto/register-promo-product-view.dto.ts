import { IsString } from 'class-validator';

export class RegisterPromoProductViewDto {
  @IsString()
  promoId: string;

  @IsString()
  producto_codigo: string;
}

