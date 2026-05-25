import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('content/promotions')
export class PromotionsController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
    @Inject('IMAGE_SERVICE') private readonly imageClient: ClientProxy,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'createPromotion')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos de imagen (webp)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async createPromotion(
    @UploadedFiles() banners: any[],
    @Body() body: any,
    @Req() req: any,
  ) {
    const requestBody = body ?? req?.body ?? {};
    const user = req.user;
    const userId = String(user?.sub ?? '');
    const normalizedBody = {
      ...requestBody,
      fechaInicio:
        requestBody?.fechaInicio ??
        requestBody?.fechainicio ??
        requestBody?.fecha_inicio,
      fechaFin:
        requestBody?.fechaFin ??
        requestBody?.fechafin ??
        requestBody?.fecha_fin,
    };

    const bannerFiles = Array.isArray(banners)
      ? banners.filter((f) => f?.fieldname === 'banners')
      : [];

    let bannerRefs: any[] | undefined;
    if (bannerFiles.length > 0) {
      const baseName = String(normalizedBody?.nombre || 'promo');
      bannerRefs = [];

      for (let i = 0; i < bannerFiles.length; i++) {
        const uniqueName = `${baseName}-${Date.now()}-${i + 1}`;
        const upload = await firstValueFrom(
          this.imageClient.send(
            { cmd: 'upload_banner' },
            {
              file: bannerFiles[i],
              nombre: uniqueName,
              variante: 'promotion',
              creadoPor: userId,
              modificadoPor: userId,
              meta: { promoNombre: baseName, index: i + 1 },
            },
          ),
        );

        if (!upload?.success || !upload?.data) {
          throw new Error(upload?.message || 'Error al subir banner');
        }

        bannerRefs.push({
          bannerId: upload.data.id,
          nombre: upload.data.nombre,
          variante: upload.data.variante,
          formato: upload.data.formato,
          dimensiones: upload.data.dimensiones,
          meta: upload.data.meta,
        });
      }
    }

    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'crearPromocion' },
        {
          ...normalizedBody,
          userId,
          ...(bannerRefs ? { banners: bannerRefs } : {}),
        },
      ),
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'updatePromotion')
  async updatePromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    const user = req.user;
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'actualizarPromocion' },
        { id, ...body, userId: user?.sub },
      ),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'listPromotions')
  async listPromotions(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'listarPromociones' },
        { page, limit, filters: parsedFilters },
      ),
    );
  }

  @Get('active')
  @SneakyThrows('PromotionsController', 'getActivePromotions')
  async getActivePromotions() {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'promocionesActivas' }, {}),
    );
  }

  @Get(':id')
  @SneakyThrows('PromotionsController', 'getPromotion')
  async getPromotion(@Param('id', ParseIntPipe) id: number) {
    return await firstValueFrom(
      this.contentClient.send({ cmd: 'obtenerPromocion' }, { id }),
    );
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'addProductToPromotion')
  async addProductToPromotion(
    @Param('id', ParseIntPipe) promoId: number,
    @Body() body: { producto_codigo: string },
  ) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'agregarProductoAPromocionActiva' },
        { promoId, ...body },
      ),
    );
  }

  @Delete(':id/products/:producto_codigo')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'removeProductFromPromotion')
  async removeProductFromPromotion(
    @Param('id', ParseIntPipe) promoId: number,
    @Param('producto_codigo') producto_codigo: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'removerProductoDePromocion' },
        { promoId, producto_codigo },
      ),
    );
  }

  @Put(':id/banner')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'upsertPromotionBanner')
  async upsertPromotionBanner(
    @Param('id', ParseIntPipe) promoId: number,
    @Body() body: { key: 'desktop' | 'tablet' | 'mobile' | 'small'; url: string },
    @Req() req: any,
  ) {
    const user = req.user;
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'upsertBannerPromocion' },
        { promoId, ...body, userId: user?.sub },
      ),
    );
  }

  @Put(':id/event')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'assignEventToPromotion')
  async assignEventToPromotion(
    @Param('id', ParseIntPipe) promoId: number,
    @Body() body: { eventId?: number | null },
    @Req() req: any,
  ) {
    const user = req.user;
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'asignarEventoAPromocion' },
        { promoId, ...body, userId: user?.sub },
      ),
    );
  }

  @Post(':id/visit')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'registerPromoVisit')
  async registerPromoVisit(@Param('id', ParseIntPipe) promoId: number, @Req() req: any) {
    const user = req.user;
    const userId = user?.sub;
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'registrarVisitaPromocion' },
        { promoId, userId },
      ),
    );
  }

  @Post(':id/product/:producto_codigo/view')
  @SneakyThrows('PromotionsController', 'registerPromoProductView')
  async registerPromoProductView(
    @Param('id', ParseIntPipe) promoId: number,
    @Param('producto_codigo') producto_codigo: string,
  ) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'registrarVistaProductoPromocion' },
        { promoId, producto_codigo },
      ),
    );
  }

  @Post(':id/product/:producto_codigo/sale')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'registerPromoProductSale')
  async registerPromoProductSale(
    @Param('id', ParseIntPipe) promoId: number,
    @Param('producto_codigo') producto_codigo: string,
    @Body() body: { qty?: number },
  ) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'registrarVentaProductoPromocion' },
        { promoId, producto_codigo, qty: body?.qty },
      ),
    );
  }

  @Get(':id/top/viewed')
  @SneakyThrows('PromotionsController', 'getMostViewedProduct')
  async getMostViewedProduct(@Param('id', ParseIntPipe) promoId: number) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'productoMasVistoEnPromocion' },
        { promoId },
      ),
    );
  }

  @Get(':id/top/sold')
  @SneakyThrows('PromotionsController', 'getMostSoldProduct')
  async getMostSoldProduct(@Param('id', ParseIntPipe) promoId: number) {
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'productoMasVendidoEnPromocion' },
        { promoId },
      ),
    );
  }

  @Get('user/last-visited')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'getLastVisitedPromosByUser')
  async getLastVisitedPromosByUser(
    @Req() req: any,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const user = req.user;
    const userId = user?.sub;
    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'ultimasPromocionesVisitadasPorUsuario' },
        { userId, limit },
      ),
    );
  }

  @Post(':id/banners/upload')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PromotionsController', 'uploadPromotionBanners')
  @UseInterceptors(
    FilesInterceptor('banners', 10, {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos de imagen (webp)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadPromotionBanners(
    @Param('id', ParseIntPipe) promoId: number,
    @UploadedFiles() banners: any[],
    @Body() body: any,
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = String(user?.sub ?? '');
    const promoName = String(body?.promoNombre || `promo-${promoId}`);

    if (!Array.isArray(banners) || banners.length === 0) {
      return { success: false, message: 'No se recibieron banners' };
    }

    const bannerRefs: any[] = [];
    for (let i = 0; i < banners.length; i++) {
      const uniqueName = `${promoName}-${Date.now()}-${i + 1}`;
      const upload = await firstValueFrom(
        this.imageClient.send(
          { cmd: 'upload_banner' },
          {
            file: banners[i],
            nombre: uniqueName,
            variante: 'promotion',
            creadoPor: userId,
            modificadoPor: userId,
            meta: { promoId, promoNombre: promoName, index: i + 1 },
          },
        ),
      );

      if (!upload?.success || !upload?.data) {
        throw new Error(upload?.message || 'Error al subir banner');
      }

      bannerRefs.push({
        bannerId: upload.data.id,
        nombre: upload.data.nombre,
        variante: upload.data.variante,
        formato: upload.data.formato,
        dimensiones: upload.data.dimensiones,
        meta: upload.data.meta,
      });
    }

    return await firstValueFrom(
      this.contentClient.send(
        { cmd: 'upsertBannerPromocion' },
        { promoId, banners: bannerRefs, userId },
      ),
    );
  }
}
