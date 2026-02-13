import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';
import {
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('content')
export class ContentController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  @Post('home')
  @SneakyThrows()
  async getHomeContent(@Body() body: { limit: number; offset: number }) {
    try {
      const content = await firstValueFrom(
        this.contentClient.send({ cmd: 'get_home_content' }, body),
      );
      return content;
    } catch (error) {
      console.error('Error in getHomeContent:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(
        'Error al obtener el contenido de inicio: ' + error.message,
      );
    }
  }

  @Post('landing')
  @SneakyThrows('ContentService', 'createLanding')
  async createLanding(@Body() body: { createLandingDto: any; usuario: string }) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearLanding' }, body),
    );
    return landing;
  }

  @Get('landings')
  @SneakyThrows('ContentService', 'getAllLandings')
  async getAllLandings(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    const landings = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'getAllLandings' },
        { page, limit, filters: parsedFilters },
      ),
    );
    return landings;
  }

  @Get('landings/active')
  @SneakyThrows('ContentService', 'getActiveLandings')
  async getActiveLandings(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const landings = await firstValueFrom(
      this.contentClient.send({ cmd: 'getActiveLandings' }, { page, limit }),
    );
    return landings;
  }

  @Get('landing/:id')
  @SneakyThrows('ContentService', 'getLandingById')
  async getLandingById(@Param('id') id: string) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'getLandingById' }, { id }),
    );
    return landing;
  }

  @Get('landing/slug/:slug')
  @SneakyThrows('ContentController', 'getLandingBySlug')
  async getLandingBySlug(@Param('slug') slug: string) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'getLandingBySlug' }, { slug }),
    );
    return landing;
  }

  @Put('landing/:id')
  @SneakyThrows('ContentController', 'updateLanding')
  async updateLanding(
    @Param('id') id: string,
    @Body() body: { updateLandingDto: any; userId: string },
  ) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'updateLanding' }, { id, ...body }),
    );
    return landing;
  }

  @Delete('landing/:id')
  @SneakyThrows('ContentController', 'deleteLanding')
  async deleteLanding(@Param('id') id: string) {
    await firstValueFrom(
      this.contentClient.send({ cmd: 'deleteLanding' }, { id }),
    );
    return { message: 'Landing eliminada exitosamente' };
  }

  @Put('landing/:id/toggle-publish')
  @SneakyThrows('ContentController', 'togglePublishLanding')
  async togglePublishLanding(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    const landing = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'togglePublishLanding' },
        { id, ...body },
      ),
    );
    return landing;
  }

  @Get('formats')
  @SneakyThrows('ContentController', 'getAllFormats')
  async getAllFormats(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    const formats = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'getAllFormats' },
        { page, limit, filters: parsedFilters },
      ),
    );
    return formats;
  }

  @Get('formats/active')
  @SneakyThrows('ContentController', 'getActiveFormats')
  async getActiveFormats() {
    const formats = await firstValueFrom(
      this.contentClient.send({ cmd: 'getActiveFormats' }, {}),
    );
    return formats;
  }

  @Get('format/:id')
  @SneakyThrows('ContentController', 'getFormatById')
  async getFormatById(@Param('id') id: string) {
    const format = await firstValueFrom(
      this.contentClient.send({ cmd: 'getFormatById' }, { id }),
    );
    return format;
  }

  @Get('format/slug/:slug')
  @SneakyThrows('ContentController', 'getFormatBySlug')
  async getFormatBySlug(@Param('slug') slug: string) {
    const format = await firstValueFrom(
      this.contentClient.send({ cmd: 'getFormatBySlug' }, { slug }),
    );
    return format;
  }

  @Post('format')
  @SneakyThrows('ContentController', 'createFormat')
  async createFormat(@Body() body: { createFormatoDto: any; userId: string }) {
    const format = await firstValueFrom(
      this.contentClient.send({ cmd: 'createFormat' }, body),
    );
    return format;
  }

  @Put('format/:id')
  @SneakyThrows('ContentController', 'updateFormat')
  async updateFormat(
    @Param('id') id: string,
    @Body() body: { updateFormatoDto: any; userId: string },
  ) {
    const format = await firstValueFrom(
      this.contentClient.send({ cmd: 'updateFormat' }, { id, ...body }),
    );
    return format;
  }

  @Delete('format/:id')
  @SneakyThrows('ContentController', 'deleteFormat')
  async deleteFormat(@Param('id') id: string) {
    await firstValueFrom(
      this.contentClient.send({ cmd: 'deleteFormat' }, { id }),
    );
    return { message: 'Formato eliminado exitosamente' };
  }

  @Get('formats/templates')
  @SneakyThrows('ContentController', 'getPredefinedTemplates')
  async getPredefinedTemplates() {
    const templates = await firstValueFrom(
      this.contentClient.send({ cmd: 'getPredefinedTemplates' }, {}),
    );
    return templates;
  }

  @Post('formats/import-template')
  @SneakyThrows('ContentController', 'importTemplate')
  async importTemplate(@Body() body: { templateKey: string; userId: string }) {
    const format = await firstValueFrom(
      this.contentClient.send({ cmd: 'importTemplate' }, body),
    );
    return format;
  }

  @Get('landings/stats')
  @SneakyThrows('ContentController', 'getLandingStats')
  async getLandingStats() {
    const stats = await firstValueFrom(
      this.contentClient.send({ cmd: 'getLandingStats' }, {}),
    );
    return stats;
  }

  @Get('formats/stats')
  @SneakyThrows('ContentController', 'getFormatStats')
  async getFormatStats() {
    const stats = await firstValueFrom(
      this.contentClient.send({ cmd: 'getFormatStats' }, {}),
    );
    return stats;
  }
}
