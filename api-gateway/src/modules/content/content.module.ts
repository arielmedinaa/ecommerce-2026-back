import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { PromotionsController } from './controllers/promotions.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MicroserviceModule.register('CONTENT_SERVICE'),
    MicroserviceModule.register('IMAGE_SERVICE'),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [ContentController, PromotionsController],
  exports: [],
})
export class ContentModule {}
