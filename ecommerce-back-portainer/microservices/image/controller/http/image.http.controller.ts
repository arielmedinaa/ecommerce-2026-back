import {
  Controller,
  Logger,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { BannerService } from '../../service/image.banners.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('controllerImageApi/image')
export class ImageHttpController {
  private readonly logger = new Logger(ImageHttpController.name);

  constructor(private readonly bannerService: BannerService) {}

  @Post('banner/list')
  async getAllBanners(@Body() body: { fields?: string[] }) {
    try {
      const result = await this.bannerService.getAllBanners(body.fields);
      return result;
    } catch (error) {
      return {
        data: [],
        message: `Error al obtener banners: ${error.message}`,
        success: false,
      };
    }
  }

  @Get('banner/:nombre/:device')
  async serveBannerImage(
    @Param('nombre') nombre: string,
    @Param('device') device: string,
    @Res() res: Response,
  ) {
    if (!device || device === '') {
      device = 'desktop';
    }
    try {
      const location = await this.bannerService.getBannerImage(nombre, device);
      if (location.kind === 'url') {
        // If bucket is private and we generate signed URLs with an internal endpoint,
        // the browser won't reach it. In that case, proxy the bytes through this service.
        if (String(process.env.IMAGE_S3_SIGNED_URLS || '').toLowerCase() === 'true') {
          const { buffer, contentType } = await this.bannerService.getBannerFileBuffer(nombre, device);
          res.set({
            'Content-Type': contentType || 'image/webp',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          return res.status(HttpStatus.OK).send(buffer);
        }
        // CDN/S3 delivery: redirect to the object URL (so browser caches and CDN does the heavy lifting)
        return res.redirect(HttpStatus.FOUND, location.value);
      }

      const filePath = location.value;
      if (!fs.existsSync(filePath)) throw new NotFoundException('La imagen solicitada no existe');

      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'image/webp';

      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
      }

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      return res.sendFile(filePath);
    } catch (error) {
      this.logger.error(`Error sirviendo imagen: ${error.message}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
          error: 'IMAGEN_NO_ENCONTRADA',
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al cargar la imagen',
        error: 'ERROR_INTERNO_SERVIDOR',
      });
    }
  }

  @Get('banner/:nombre')
  async serveBannerImageDefault(
    @Param('nombre') nombre: string,
    @Res() res: Response,
  ) {
    return this.serveBannerImage(nombre, 'desktop', res);
  }
}
