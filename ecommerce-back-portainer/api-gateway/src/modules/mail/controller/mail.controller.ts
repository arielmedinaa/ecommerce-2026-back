import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller('mail')
export class MailController {
  constructor(@Inject('MAIL_SERVICE') private readonly mailClient: ClientProxy) {}

  @UseGuards(JwtAuthGuard)
  @Post('contact')
  async sendContact(
    @Body() body: { to: string; subject: string; mensaje: string; deNombre?: string },
  ) {
    return await firstValueFrom(
      this.mailClient.send({ cmd: 'send_contact_email' }, body),
    );
  }
}
