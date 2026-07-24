import { Module } from '@nestjs/common';
import { MailController } from '@mail/controller/mail.controller';
import { MailService } from '@mail/service/mail.service';
import { MailTransportService } from '@mail/service/mail-transport.service';
import { MariaDbModule } from '@mail/config/mariadb.module';

@Module({
  imports: [
    MariaDbModule.forAuthRead(),
    MariaDbModule.forFeatureAuthRead(),
  ],
  controllers: [MailController],
  providers: [MailService, MailTransportService],
})
export class MailModule {}
