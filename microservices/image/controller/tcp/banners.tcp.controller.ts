import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BannerService } from '../../service/image.banners.service';

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

  @MessagePattern({ cmd: 'upload_banner_from_s3' })
  async uploadBannerFromS3(@Payload() data: {
    key: string;
    nombre: string;
    variante: string;
    creadoPor: string;
    modificadoPor: string;
    meta?: Record<string, any>;
    contentType?: string;
  }) {
    return await this.bannerService.uploadBannerFromS3(
      data.key,
      data.nombre,
      data.variante,
      data.creadoPor,
      data.modificadoPor,
      data.meta,
      data.contentType,
    );
  }

  @MessagePattern({ cmd: 'get_banner_image' })
  async getBannerImage(@Payload() data: { nombre: string; device?: string }) {
    const location = await this.bannerService.getBannerImage(
      data.nombre,
      data.device || 'desktop',
    );

    return {
      data: { filePath: location.value },
      message: 'Imagen de banner obtenida exitosamente',
      success: true,
    };
  }

  @MessagePattern({ cmd: 'get_banner_file' })
  async getBannerFile(@Payload() data: { nombre: string; device?: string }) {
    try {
      const { buffer, contentType } = await this.bannerService.getBannerFileBuffer(
        data.nombre,
        data.device || 'desktop',
      );
      return {
        data: { buffer, contentType },
        message: 'Archivo de banner obtenido exitosamente',
        success: true,
      };
    } catch (err: any) {
      return {
        data: null,
        message: err?.message || 'Error obteniendo archivo de banner',
        success: false,
      };
    }
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
