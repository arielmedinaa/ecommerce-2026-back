import { Module } from '@nestjs/common';
import { BannersController } from './controller/tcp/banners.tcp.controller';
import { ImageHttpController } from './controller/http/image.http.controller';
import { CartScreenshotController } from './controller/tcp/cart-screenshot.tcp.controller';
import { BannerService } from './service/image.banners.service';
import { BannerValidationService } from './service/errors/image.spec';
import { BannerErrorService } from './service/errors/banner-error.service';
import { CartScreenshotService } from './service/cart-screenshot.service';
import { MariaDbModule } from './config/mariadb.module';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MariaDbModule,
    MicroserviceModule.register('MAIL_SERVICE'),
  ],
  controllers: [BannersController, ImageHttpController, CartScreenshotController],
  providers: [
    BannerService,
    ImageStorageService,
    BannerValidationService,
    BannerErrorService,
    CartScreenshotService
  ],
  exports: [
    BannerService,
    ImageStorageService,
    BannerValidationService,
    BannerErrorService,
    CartScreenshotService
  ]
})
export class ImageModule {}
