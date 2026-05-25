import { IsString } from 'class-validator';

export class RegisterPromoVisitDto {
  @IsString()
  promoId: string;

  @IsString()
  userId: string;
}

