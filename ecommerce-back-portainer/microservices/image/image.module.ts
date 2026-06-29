import { Module } from '@nestjs/common';
import { BannersController } from './controller/tcp/banners.tcp.controller';
import { ImageHttpController } from './controller/http/image.http.controller';
import { BannerService } from './service/image.banners.service';
import { BannerValidationService } from './service/errors/image.spec';
import { BannerErrorService } from './service/errors/banner-error.service';
import { MariaDbModule } from './config/mariadb.module';
import { ImageStorageService } from '@shared/common/services/image-storage.service';

@Module({
  imports: [
    MariaDbModule
  ],
  controllers: [BannersController, ImageHttpController],
  providers: [
    BannerService,
    ImageStorageService,
    BannerValidationService,
    BannerErrorService
  ],
  exports: [
    BannerService,
    ImageStorageService,
    BannerValidationService,
    BannerErrorService
  ]
})
export class ImageModule {}
