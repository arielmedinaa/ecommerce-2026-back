import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FilterHomeDto } from '@home/dto/filter.home';

@Controller('content')
export class ContentController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  @Post('home')
  async getHomeContent(@Body() filter: FilterHomeDto) {
    try {
      const content = await firstValueFrom(
        this.contentClient.send({ cmd: 'get_home_content' }, filter),
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
