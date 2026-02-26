import {
  Controller,
  Logger,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BannerService } from '../service/image.banners.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('controllerImageApi/image')
export class BannersController {
  private readonly logger = new Logger(BannersController.name);

  constructor(private readonly bannerService: BannerService) {}

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
      const filePath = await this.bannerService.getBannerImage(nombre, device);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('La imagen solicitada no existe');
      }
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

  @MessagePattern({ cmd: 'upload_banner' })
  async uploadBanner(data: {
    file: any;
    nombre: string;
    variante: string;
    creadoPor: string;
    modificadoPor: string;
  }) {
    return await this.bannerService.uploadBanner(
      data.file,
      data.nombre,
      data.variante,
      data.creadoPor,
      data.modificadoPor,
    );
  }

  @MessagePattern({ cmd: 'get_banner_image' })
  async getBannerImage(data: { nombre: string; device?: string }) {
    const filePath = await this.bannerService.getBannerImage(
      data.nombre,
      data.device || 'desktop',
    );

    return {
      data: { filePath },
      message: 'Imagen de banner obtenida exitosamente',
      success: true,
    };
  }

  @MessagePattern({ cmd: 'get_all_banners' })
  async getAllBanners(@Payload() data: { fields?: string[] }) {
    return await this.bannerService.getAllBanners(data.fields);
  }

  @MessagePattern({ cmd: 'get_banner_by_id' })
  async getBannerById(data: { id: string }) {
    return await this.bannerService.getBannerById(data.id);
  }

  @MessagePattern({ cmd: 'delete_banner' })
  async deleteBanner(data: { id: string }) {
    this.logger.log(`Deleting banner: ${data.id}`);
    return await this.bannerService.deleteBanner(data.id);
  }

  @MessagePattern({ cmd: 'toggle_banner_status' })
  async toggleBannerStatus(data: { id: string }) {
    try {
      this.logger.log(`Toggling banner status: ${data.id}`);
      return await this.bannerService.toggleBannerStatus(data.id);
    } catch (error) {
      this.logger.error(`Error toggling banner status: ${error.message}`);
      return {
        data: null,
        message: error.message,
        success: false,
      };
    }
  }

  @MessagePattern({ cmd: 'get_banner_dimensions' })
  getBannerDimensions() {
    try {
      this.logger.log('Getting banner dimensions');
      return {
        data: this.bannerService.getAvailableDimensions(),
        message: 'Dimensiones disponibles obtenidas exitosamente',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error getting banner dimensions: ${error.message}`);
      return {
        data: null,
        message: error.message,
        success: false,
      };
    }
  }
}
