import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MicroserviceModule.register('CONTENT_SERVICE'),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [ContentController],
  exports: [],
})
export class ContentModule {}
