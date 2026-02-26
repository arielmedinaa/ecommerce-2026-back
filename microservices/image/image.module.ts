import { Module } from '@nestjs/common';
import { BannersController } from './controller/tcp/banners.tcp.controller';
import { ImageHttpController } from './controller/http/image.http.controller';
import { BannerService } from './service/image.banners.service';
import { BannerValidationService } from './service/errors/image.spec';
import { BannerErrorService } from './service/errors/banner-error.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Banners, BannersSchema } from './schemas/banners/banners.schema';
import { BannerError, BannerErrorSchema } from './schemas/errors/banners.error.schema';
import { DatabaseModule } from '@shared/config/database/database.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    MongooseModule.forFeature([
      { name: Banners.name, schema: BannersSchema },
      { name: BannerError.name, schema: BannerErrorSchema }
    ])
  ],
  controllers: [BannersController, ImageHttpController],
  providers: [
    BannerService,
    BannerValidationService,
    BannerErrorService
  ],
  exports: [
    BannerService,
    BannerValidationService,
    BannerErrorService
  ]
})
export class ImageModule {}
