import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ImageController } from './controller/image.controller';

@Module({
  imports: [
    JwtModule,
    MicroserviceModule.register('IMAGE_SERVICE'),
  ],
  controllers: [ImageController],
  exports: [],
})
export class ImageModule {}
