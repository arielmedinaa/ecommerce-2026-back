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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

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
  async createLanding(@Body() body: { createLandingDto: any; userId: string }) {
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
  async getLandingById(@Param('id') id: number) {
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
    @Param('id') id: number,
    @Body() body: { updateLandingDto: any; userId: string },
  ) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'updateLanding' }, { id, ...body }),
    );
    return landing;
  }

  @Delete('landing/:id')
  @SneakyThrows('ContentController', 'deleteLanding')
  async deleteLanding(@Param('id') id: number) {
    await firstValueFrom(
      this.contentClient.send({ cmd: 'deleteLanding' }, { id }),
    );
    return { message: 'Landing eliminada exitosamente' };
  }

  @Put('landing/:id/toggle-publish')
  @SneakyThrows('ContentController', 'togglePublishLanding')
  async togglePublishLanding(
    @Param('id') id: number,
    @Body() body: { userId: string },
  ) {
    const landing = await firstValueFrom(
      this.contentClient.send({ cmd: 'togglePublishLanding' }, { id, ...body }),
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
        { cmd: 'getAllFormatos' },
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

  @Post('vertical')
  @SneakyThrows('ContentController', 'createVertical')
  async createVertical(@Body() body: { vertical: any; userId: string }) {
    const vertical = await firstValueFrom(
      this.contentClient.send({ cmd: 'createVertical' }, body),
    );
    return vertical;
  }

  @Get('vertical/:id')
  @SneakyThrows('ContentController', 'getVerticalById')
  async getVerticalById(@Param('id') id: string) {
    const vertical = await firstValueFrom(
      this.contentClient.send({ cmd: 'getVerticalById' }, { id }),
    );
    return vertical;
  }

  @Post('vertical/listar')
  @SneakyThrows('ContentController', 'getAllVerticales')
  async getAllVerticales(@Body() filters: any) {
    const verticales = await firstValueFrom(
      this.contentClient.send({ cmd: 'getAllVerticales' }, filters),
    );
    return verticales;
  }

  @Post('cupon')
  @SneakyThrows('ContentController', 'crearCupon')
  async crearCupon(@Body() body: any) {
    const cupon = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearCupon' }, body),
    );
    return cupon;
  }

  @Get('cupones')
  @SneakyThrows('ContentController', 'listarCupones')
  async listarCupones(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    const cupones = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'listarCupones' },
        { page, limit, filters: parsedFilters },
      ),
    );
    return cupones;
  }

  @Post('cupon/validar')
  @SneakyThrows('ContentController', 'validarCupon')
  async validarCupon(@Body() body: { codigo: string; montoCarrito: number }) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'validarCupon' }, body),
    );
    return result;
  }

  @Put('cupon/:codigo/usar')
  @SneakyThrows('ContentController', 'registrarUsoCupon')
  async registrarUsoCupon(@Param('codigo') codigo: string) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'registrarUsoCupon' }, { codigo }),
    );
    return result;
  }

  @Delete('cupon/:id')
  @SneakyThrows('ContentController', 'desactivarCupon')
  async desactivarCupon(@Param('id', ParseIntPipe) id: number) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'desactivarCupon' }, { id }),
    );
    return { message: 'Cupón desactivado exitosamente', cupon: result };
  }

  // Eventos
  @Post('event')
  @SneakyThrows('ContentController', 'createEvent')
  async createEvent(@Body() body: any) {
    const event = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearEvento' }, body),
    );
    return event;
  }

  @Get('events')
  @SneakyThrows('ContentController', 'listEvents')
  async listEvents(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    const events = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'listarEventos' },
        { page, limit, filters: parsedFilters },
      ),
    );
    return events;
  }

  @Get('events/active')
  @SneakyThrows('ContentController', 'getActiveEvents')
  async getActiveEvents() {
    const events = await firstValueFrom(
      this.contentClient.send({ cmd: 'eventosActivos' }, {}),
    );
    return events;
  }

  @Get('event/:id')
  @SneakyThrows('ContentController', 'getEventById')
  async getEventById(@Param('id', ParseIntPipe) id: number) {
    const event = await firstValueFrom(
      this.contentClient.send({ cmd: 'obtenerEvento' }, { id }),
    );
    return event;
  }

  @Post('event/:id/product')
  @SneakyThrows('ContentController', 'addProductToEvent')
  async addProductToEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { producto_codigo: string; limitePorUsuario?: number },
  ) {
    const result = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'agregarProductoAEvento' },
        { eventId: id, ...body },
      ),
    );
    return result;
  }

  @Delete('event/:id/product/:producto_codigo')
  @SneakyThrows('ContentController', 'removeProductFromEvent')
  async removeProductFromEvent(
    @Param('id', ParseIntPipe) id: number,
    @Param('producto_codigo') producto_codigo: string,
  ) {
    await firstValueFrom(
      this.contentClient.send(
        { cmd: 'removerProductoDeEvento' },
        { eventId: id, producto_codigo },
      ),
    );
    return { message: 'Producto removido del evento exitosamente' };
  }

  @Get('event/validate')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('ContentController', 'validateProductForCart')
  async validateProductForCart(
    @Query('producto_codigo') producto_codigo: string,
    @Req() req: any,
  ) {
    const usuario = req.user;
    const cliente_id = usuario.sub;

    const result = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'validarProductoParaCarrito' },
        { producto_codigo, cliente_id, usuario },
      ),
    );
    return result;
  }

  @Get('events/tree')
  @SneakyThrows('ContentController', 'getEventHierarchy')
  async getEventHierarchy() {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'obtenerJerarquiaEventos' }, {}),
    );
    return result;
  }

  // Condiciones de eventos
  @Post('event/condition')
  @SneakyThrows('ContentController', 'createCondition')
  async createCondition(@Body() body: any) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearCondicionEvento' }, body),
    );
    return result;
  }

  @Get('event/conditions')
  @SneakyThrows('ContentController', 'listConditions')
  async listConditions(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    const result = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'listarCondiciones' },
        { page, limit, filters: parsedFilters },
      ),
    );
    return result;
  }

  @Delete('event/condition/:id')
  @SneakyThrows('ContentController', 'deleteCondition')
  async deleteCondition(@Param('id', ParseIntPipe) id: number) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'eliminarCondicion' }, { id }),
    );
    return result;
  }

  @Put('event/condition/:id/toggle')
  @SneakyThrows('ContentController', 'toggleCondition')
  async toggleCondition(@Param('id', ParseIntPipe) id: number) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'toggleCondicion' }, { id }),
    );
    return result;
  }

  @Delete('event/:id')
  @SneakyThrows('ContentController', 'deleteEvent')
  async deleteEvent(@Param('id', ParseIntPipe) id: number) {
    const result = await firstValueFrom(
      this.contentClient.send({ cmd: 'eliminarEvento' }, { id }),
    );
    return result;
  }
}
