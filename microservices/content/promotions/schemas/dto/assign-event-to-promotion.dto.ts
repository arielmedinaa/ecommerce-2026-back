import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class AssignEventToPromotionDto {
  @IsNumberString()
  promoId: string;

  @IsOptional()
  @IsNumberString()
  eventId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

