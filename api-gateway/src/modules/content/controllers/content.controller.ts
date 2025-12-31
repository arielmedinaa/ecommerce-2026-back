import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('content')
export class ContentController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  @Get('home')
  async getHomeContent() {
    try {
      const content = await firstValueFrom(
        this.contentClient.send({ cmd: 'get_home_content' }, {}),
      );
      return content;
    } catch (error) {
      console.error('Error in getHomeContent:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Error al obtener el contenido de inicio: ' + error.message);
    }
  }
}
