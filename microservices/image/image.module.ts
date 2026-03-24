import { Module } from '@nestjs/common';
import { BannersController } from './controller/tcp/banners.tcp.controller';
import { ImageHttpController } from './controller/http/image.http.controller';
import { BannerService } from './service/image.banners.service';
import { BannerValidationService } from './service/errors/image.spec';
import { BannerErrorService } from './service/errors/banner-error.service';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    MariaDbModule
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
