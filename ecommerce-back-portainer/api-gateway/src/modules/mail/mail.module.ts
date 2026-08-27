import { Module } from '@nestjs/common';
import { MailController } from './controller/mail.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MicroserviceModule.register('MAIL_SERVICE'),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [MailController],
  providers: [JwtAuthGuard],
  exports: [],
})
export class MailModule {}
