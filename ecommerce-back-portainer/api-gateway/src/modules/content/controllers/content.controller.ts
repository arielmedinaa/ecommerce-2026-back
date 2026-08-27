import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';
import {
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

const VerticalLogoFileInterceptor = () =>
  UseInterceptors(
    FileInterceptor('files', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype?.startsWith('image/')) {
          return callback(new BadRequestException('El archivo debe ser una imagen'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  );

@Controller('content')
export class ContentController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/facturacion-mensual')
  async getDashboardFacturacion() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_facturacion' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/porcentaje-ecommerce')
  async getDashboardPorcentajeEcommerce() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_porcentaje_ecommerce' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/historial')
  async getDashboardHistorial(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_historial' }, { desde, hasta }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/facturacion-en-vivo')
  async getDashboardFacturacionEnVivo() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_facturacion_en_vivo' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('dashboard/historial/recalcular')
  async recalcularDashboardHistorial(@Body() body: { desde: string; hasta: string }) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'recalcular_dashboard_historial' },
        { desde: body?.desde, hasta: body?.hasta },
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/historial/contado-credito')
  async getDashboardHistorialContadoCredito(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_historial_contado_credito' }, { desde, hasta }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/comparar-fecha')
  async getDashboardCompararFecha(@Query('fecha') fecha: string) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_comparar_fecha' }, { fecha }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/a-facturar/resumen')
  async getDashboardAFacturarResumen() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_a_facturar_resumen' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/a-facturar/detalle')
  async getDashboardAFacturarDetalle(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_a_facturar_detalle' }, { desde, hasta }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/a-facturar/contado-credito')
  async getDashboardAFacturarContadoCredito(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_dashboard_a_facturar_contado_credito' }, { desde, hasta }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/widgets')
  async listDashboardWidgets() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'list_dashboard_widgets' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('dashboard/widgets')
  async createDashboardWidget(
    @Body() body: { nombre: string; tipo: 'predefinido' | 'personalizado'; config: any; tamano: string; icono?: string; color?: string },
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'create_dashboard_widget' }, body),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('dashboard/widgets/:id')
  async updateDashboardWidget(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre: string; tipo: 'predefinido' | 'personalizado'; config: any; tamano: string; icono?: string; color?: string },
  ) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'update_dashboard_widget' }, { id, ...body }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('dashboard/widgets/:id')
  async deleteDashboardWidget(@Param('id', ParseIntPipe) id: number) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'delete_dashboard_widget' }, { id }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('dashboard/widgets/preview')
  async previewDashboardWidgetQuery(@Body() body: Record<string, any>) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'preview_dashboard_widget_query' }, body),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/widgets/entidades')
  async getEntityCatalog() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'list_entity_catalog' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/widgets/catalogo')
  async getWidgetCatalog() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'list_widget_catalog' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/widgets/predefinidas')
  async getPredefinedStats() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'list_predefined_stats' }, {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('dashboard/meta-ventas')
  async setMetaVentas(@Body() body: { monto: number }, @Req() request: any) {
    const actualizadoPor = request.user?.email || request.user?.sub || 'admin';
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'set_meta_ventas' },
        { monto: Number(body?.monto), actualizadoPor },
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('dashboard/ingresos-externos')
  async createIngresoExterno(
    @Body() body: { monto: number; concepto: string; fecha: string },
    @Req() request: any,
  ) {
    const creadoPor = request.user?.email || request.user?.sub || 'admin';
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'create_ingreso_externo' },
        {
          monto: Number(body?.monto),
          concepto: body?.concepto,
          fecha: body?.fecha,
          creadoPor,
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('dashboard/ingresos-externos/:id')
  async deleteIngresoExterno(@Param('id', ParseIntPipe) id: number) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'delete_ingreso_externo' }, { id }),
    );
  }

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

  @Get('home/carousel/:key')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('ContentController', 'getPersonalizedCarousel')
  async getPersonalizedCarousel(@Param('key') key: string, @Req() req: any) {
    const userId = req.user?.sub;
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'get_personalized_carousel' }, { userId, key }),
    );
  }

  @Get('home/sections')
  @SneakyThrows()
  async listHomeSections() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'list_home_sections' }, {}),
    );
  }

  @Post('home/sections')
  @SneakyThrows()
  async upsertHomeSection(@Body() body: any) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'upsert_home_section' }, body),
    );
  }

  @Put('home/sections/:key')
  @SneakyThrows()
  async upsertHomeSectionByKey(@Param('key') key: string, @Body() body: any) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'upsert_home_section_by_key' },
        { key, ...body },
      ),
    );
  }

  @Delete('home/sections/:key')
  @SneakyThrows()
  async deleteHomeSection(@Param('key') key: string) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'delete_home_section' }, { key }),
    );
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

  @Get('promotions/active')
  @SneakyThrows('ContentController', 'promocionesActivas')
  async getActivePromotions() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'promocionesActivas' }, {}),
    );
  }

  @Get('promotions')
  @SneakyThrows('ContentController', 'listarPromociones')
  async listPromotions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'listarPromociones' },
        { page: page ?? 1, limit: limit ?? 50, filters: parsedFilters },
      ),
    );
  }

  @Get('promotions/:id/products')
  @SneakyThrows('ContentController', 'productosDePromocion')
  async getPromotionProducts(@Param('id') id: string) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'productosDePromocion' }, { promoId: id }),
    );
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

  @Put('vertical/:id')
  @SneakyThrows('ContentController', 'updateVertical')
  async updateVertical(
    @Param('id') id: string,
    @Body() body: { vertical: any; userId?: string },
  ) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'updateVertical' },
        { id, vertical: body?.vertical ?? body, userId: body?.userId },
      ),
    );
  }

  @Delete('vertical/:id')
  @SneakyThrows('ContentController', 'deleteVertical')
  async deleteVertical(@Param('id') id: string) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'deleteVertical' }, { id }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('verticals/:id/images')
  @VerticalLogoFileInterceptor()
  @SneakyThrows('ContentController', 'uploadVerticalLogo')
  async uploadVerticalLogo(
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo de logo requerido');
    }
    return await firstValueFrom(
      this.contentClient
        .send({ cmd: 'upload_vertical_logo' }, { id, file })
        .pipe(timeout(15000)),
    );
  }

  @Get('vertical/logo/:nombreSanitizado/:fileName')
  async getVerticalLogoFile(
    @Param('nombreSanitizado') nombreSanitizado: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await firstValueFrom(
      this.contentClient.send(
        { cmd: 'get_vertical_logo_file' },
        { nombreSanitizado, fileName },
      ),
    );
    const buf = Buffer.isBuffer(buffer)
      ? buffer
      : buffer && Array.isArray((buffer as any).data)
        ? Buffer.from((buffer as any).data)
        : Buffer.from(buffer);
    res.setHeader('Content-Type', contentType || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  }

  @Post('cupon')
  @SneakyThrows('ContentController', 'crearCupon')
  @UseGuards(JwtAuthGuard)
  async crearCupon(@Body() body: any) {
    const cupon = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearCupon' }, body),
    );
    return cupon;
  }

  @Post('cuponPorProducto')
  
  @SneakyThrows('ContentController', 'crearCuponPorProducto')
  async crearCuponPorProducto(@Body() body: any) {
    const cupon = await firstValueFrom(
      this.contentClient.send({ cmd: 'crearCuponPorProducto' }, body),
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

  @Get('cupon/:id')
  @SneakyThrows('ContentController', 'obtenerCuponPorId')
  async obtenerCuponPorId(@Param('id', ParseIntPipe) id: number) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'obtener_cupon_por_id' }, { id }),
    );
  }

  @Get('cuponesPorProducto')
  @SneakyThrows('ContentController', 'obtenerCuponesPorProducto')
  async obtenerCuponesPorProducto(@Query('productId') productId: string) {
    const cupones = await firstValueFrom(
      this.contentClient.send({ cmd: 'obtenerCuponesPorProducto' }, { productId }),
    );
    return cupones;
  }

  @Post('cuponPorProducto/desasignar')
  @SneakyThrows('ContentController', 'desasignarCuponPorProducto')
  async desasignarCuponPorProducto(@Body() body: any) {
    const cupon = await firstValueFrom(
      this.contentClient.send({ cmd: 'desasignarCuponPorProducto' }, body),
    );
    return cupon;
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
