import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BannerService } from '../../service/image.banners.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class BannersController {
  constructor(private readonly bannerService: BannerService) {}

  @MessagePattern({ cmd: 'upload_banner' })
  async uploadBanner(@Payload() data: {
    file: any;
    nombre: string;
    variante: string;
    creadoPor: string;
    modificadoPor: string;
    meta?: Record<string, any>;
  }) {
    return await this.bannerService.uploadBanner(
      data.file,
      data.nombre,
      data.variante,
      data.creadoPor,
      data.modificadoPor,
      data.meta,
    );
  }

  @MessagePattern({ cmd: 'get_banner_image' })
  async getBannerImage(@Payload() data: { nombre: string; device?: string }) {
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

  @MessagePattern({ cmd: 'get_banner_file' })
  async getBannerFile(@Payload() data: { nombre: string; device?: string }) {
    const filePath = await this.bannerService.getBannerImage(
      data.nombre,
      data.device || 'desktop',
    );

    if (!fs.existsSync(filePath)) {
      return {
        data: null,
        message: 'La imagen solicitada no existe',
        success: false,
      };
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

    const buffer = fs.readFileSync(filePath);
    return {
      data: { buffer, contentType },
      message: 'Archivo de banner obtenido exitosamente',
      success: true,
    };
  }

  @MessagePattern({ cmd: 'get_all_banners' })
  async getAllBanners(@Payload() data: { fields?: string[] }) {
    const result = await this.bannerService.getAllBanners(data.fields);
    return result;
  }

  @MessagePattern({ cmd: 'get_banner_by_id' })
  async getBannerById(@Payload() data: { id: string }) {
    return await this.bannerService.getBannerById(data.id);
  }

  @MessagePattern({ cmd: 'delete_banner' })
  async deleteBanner(@Payload() data: { id: string }) {
    return await this.bannerService.deleteBanner(data.id);
  }

  @MessagePattern({ cmd: 'toggle_banner_status' })
  async toggleBannerStatus(@Payload() data: { id: string }) {
    return await this.bannerService.toggleBannerStatus(data.id);
  }

  @MessagePattern({ cmd: 'get_banner_dimensions' })
  async getBannerDimensions() {
    return {
      data: this.bannerService.getAvailableDimensions(),
      message: 'Dimensiones disponibles obtenidas exitosamente',
      success: true,
    };
  }
}
