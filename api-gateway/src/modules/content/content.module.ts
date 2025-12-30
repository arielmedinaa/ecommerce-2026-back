import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.forFeature(['CONTENT_SERVICE']),
  ],
  controllers: [ContentController],
  exports: [],
})
export class ContentModule {}
