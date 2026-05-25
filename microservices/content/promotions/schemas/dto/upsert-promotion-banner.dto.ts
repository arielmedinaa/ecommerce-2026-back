import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertPromotionBannerDto {
  @IsString()
  promoId: string;

  @IsIn(['desktop', 'tablet', 'mobile', 'small'])
  key: 'desktop' | 'tablet' | 'mobile' | 'small';

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

