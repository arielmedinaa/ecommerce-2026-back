import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { HomeSectionType } from '../schemas/home-section.schema';

export class UpsertHomeSectionDto {
  @IsString()
  key: string;

  @IsString()
  type: HomeSectionType | string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

