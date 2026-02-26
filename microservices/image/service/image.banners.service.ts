import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banners, BannersDocument } from '../schemas/banners/banners.schema';
import { BannerValidationService } from './errors/image.spec';
import { BannerErrorService } from './errors/banner-error.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Express } from 'express';
import { Multer } from 'multer';

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);
  private readonly bannersDir: string;
  private readonly dimensions = {
    desktop: { width: 1440, height: 400 },
    tablet: { width: 768, height: 300 },
    mobile: { width: 375, height: 200 },
    small: { width: 320, height: 150 },
  };

  constructor(
    @InjectModel('Banners')
    private readonly bannerModel: Model<BannersDocument>,
    private readonly bannerValidationService: BannerValidationService,
    private readonly bannerErrorService: BannerErrorService,
  ) {
    this.bannersDir =
      process.env.DIR_IMAGE ||
      '~/Documents/projects/newEcommerce2026/imagesEcommerce/banners';
    this.bannersDir = this.bannersDir.replace('~', require('os').homedir());
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.bannersDir)) {
      fs.mkdirSync(this.bannersDir, { recursive: true });
    }
  }

  async uploadBanner(
    file: Multer.File,
    nombre: string,
    variante: string,
    creadoPor: string,
    modificadoPor: string,
  ): Promise<{ data: Banners; message: string; success: boolean }> {
    try {
      const validation =
        await this.bannerValidationService.validateBannerUpload(
          file,
          nombre,
          variante,
          creadoPor,
          modificadoPor,
        );

      if (!validation.isValid) {
        return validation.error;
      }

      const existingBanner = await this.bannerModel.findOne({ nombre });
      if (existingBanner) {
        const error = new Error('Ya existe un banner con ese nombre');
        await this.bannerErrorService.logValidationError(
          existingBanner._id.toString(),
          'uploadBanner',
          'nombre_duplicado',
          { nombre, variante },
          creadoPor,
        );
        return {
          data: null as any,
          message: 'Ya existe un banner con ese nombre',
          success: false,
        };
      }

      const bannerId = uuidv4();
      const baseFileName = `${bannerId}_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const savedImages = await this.processAndSaveImages(
        file,
        baseFileName,
        bannerId,
        nombre,
        creadoPor,
      );
      const bannerData = {
        nombre,
        imagen: savedImages.desktop.fileName,
        variante,
        formato: 'webp',
        ruta: savedImages.desktop.filePath,
        estado: 'activo',
        creadoPor,
        modificadoPor,
        dimensiones: savedImages,
      };

      const newBanner = await this.bannerModel.create(bannerData);
      return {
        data: newBanner,
        message: 'Banner subido exitosamente en todas las dimensiones',
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        'unknown',
        'uploadBanner',
        { nombre, variante, creadoPor, modificadoPor },
        creadoPor,
      );
      return {
        data: null as any,
        message: `Error al subir el banner: ${error}`,
        success: false,
      };
    }
  }

  private async processAndSaveImages(
    file: Multer.File,
    baseFileName: string,
    bannerId: string,
    nombre: string,
    creadoPor: string,
  ): Promise<any> {
    const savedImages = {};
    const tempPath = file.path;

    try {
      for (const [device, dimension] of Object.entries(this.dimensions)) {
        const fileName = `${baseFileName}_${device}.webp`;
        const filePath = path.join(this.bannersDir, fileName);

        try {
          await sharp(tempPath)
            .resize(dimension.width, dimension.height, {
              fit: 'cover',
              position: 'center',
            })
            .webp({ quality: 85 })
            .toFile(filePath);

          savedImages[device] = {
            fileName,
            filePath,
            width: dimension.width,
            height: dimension.height,
            url: `/image/banner/${baseFileName.split('_')[1]}/${device}`,
          };
        } catch (processError) {
          await this.bannerErrorService.logFileProcessingError(
            bannerId,
            fileName,
            device,
            processError,
            'processAndSaveImages',
            creadoPor,
          );
          throw processError;
        }
      }

      // Eliminar archivo temporal
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      return savedImages;
    } catch (error) {
      // Limpiar archivos temporales en caso de error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  async getBannerImage(
    nombre: string,
    device: string = 'desktop',
  ): Promise<string> {
    try {
      // Validar dispositivo
      const deviceValidation =
        await this.bannerValidationService.validateDevice(
          device,
          'getBannerImage',
        );
      if (!deviceValidation.isValid) {
        throw new BadRequestException(deviceValidation.error.message);
      }

      // Agregar logging para debugging
      this.logger.log(
        `Buscando banner con nombre: "${nombre}" y device: "${device}"`,
      );

      const banner = await this.bannerModel.findOne({
        nombre,
        estado: 'activo',
      });

      this.logger.log(`Banner encontrado: ${banner ? 'SÍ' : 'NO'}`);
      if (banner) {
        this.logger.log(
          `ID del banner: ${banner._id}, nombre guardado: "${banner.nombre}"`,
        );
      }

      if (!banner) {
        const error = new NotFoundException('Banner no encontrado');
        await this.bannerErrorService.logValidationError(
          'unknown',
          'getBannerImage',
          'banner_no_encontrado',
          { nombre, device },
        );
        throw error;
      }

      // Buscar archivo existente que coincida con el nombre del banner
      const files = fs.readdirSync(this.bannersDir);
      const matchingFile = files.find(
        (file) =>
          file.includes(nombre.replace(/[^a-zA-Z0-9]/g, '_')) &&
          file.includes(`${device}.webp`),
      );

      if (!matchingFile) {
        this.logger.log(
          `No se encontró archivo para "${nombre}" con device "${device}"`,
        );
        const error = new NotFoundException('Imagen del banner no encontrada');
        await this.bannerErrorService.logValidationError(
          banner._id.toString(),
          'getBannerImage',
          'imagen_no_encontrada',
          { nombre, device, availableFiles: files },
        );
        throw error;
      }

      const filePath = path.join(this.bannersDir, matchingFile);
      this.logger.log(`Archivo encontrado: ${matchingFile}`);
      this.logger.log(`Ruta completa: ${filePath}`);

      return filePath;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      await this.bannerErrorService.logMicroserviceError(
        error,
        'unknown',
        'getBannerImage',
        { nombre, device },
      );
      throw new BadRequestException(
        `Error al obtener la imagen del banner: ${error}`,
      );
    }
  }

  async getAllBanners(
    fields?: string[],
  ): Promise<{
    data: Banners[];
    message: string;
    success: boolean;
  }> {
    try {
      const banners = await this.bannerModel.find({}, fields).sort({ createdAt: -1 });
      return {
        data: banners,
        message: 'Banners obtenidos exitosamente',
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        'unknown',
        'getAllBanners',
      );
      return {
        data: null as any,
        message: `Error al obtener los banners: ${error}`,
        success: false,
      };
    }
  }

  async getBannerById(
    id: string,
  ): Promise<{ data: Banners; message: string; success: boolean }> {
    try {
      // Validar ID
      const idValidation = await this.bannerValidationService.validateBannerId(
        id,
        'getBannerById',
      );
      if (!idValidation.isValid) {
        return idValidation.error;
      }

      const banner = await this.bannerModel.findById(id);
      if (!banner) {
        new NotFoundException('Banner no encontrado');
        await this.bannerErrorService.logValidationError(
          id,
          'getBannerById',
          'banner_no_encontrado',
          { id },
        );
        return {
          data: null as any,
          message: 'Banner no encontrado',
          success: false,
        };
      }

      return {
        data: banner,
        message: 'Banner encontrado exitosamente',
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        id,
        'getBannerById',
      );
      return {
        data: null as any,
        message: `Error al obtener el banner: ${error}`,
        success: false,
      };
    }
  }

  async deleteBanner(
    id: string,
  ): Promise<{ data: null; message: string; success: boolean }> {
    try {
      const idValidation = await this.bannerValidationService.validateBannerId(
        id,
        'deleteBanner',
      );
      if (!idValidation.isValid) {
        return idValidation.error;
      }
      const banner = await this.bannerModel.findById(id);
      if (!banner) {
        const error = new NotFoundException('Banner no encontrado');
        await this.bannerErrorService.logValidationError(
          id,
          'deleteBanner',
          'banner_no_encontrado',
          { id },
        );
        return {
          data: null as any,
          message: 'Banner no encontrado',
          success: false,
        };
      }

      const baseFileName = `${banner._id}_${banner.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
      for (const device of Object.keys(this.dimensions)) {
        const fileName = `${baseFileName}_${device}.webp`;
        const filePath = path.join(this.bannersDir, fileName);

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (deleteError) {
            await this.bannerErrorService.logFileProcessingError(
              id,
              fileName,
              device,
              deleteError,
              'deleteBanner',
            );
          }
        }
      }

      await this.bannerModel.findByIdAndDelete(id);
      return {
        data: null as any,
        message: 'Banner eliminado exitosamente',
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        id,
        'deleteBanner',
      );
      return {
        data: null as any,
        message: `Error al eliminar el banner: ${error}`,
        success: false,
      };
    }
  }

  async toggleBannerStatus(
    id: string,
  ): Promise<{ data: Banners; message: string; success: boolean }> {
    try {
      const idValidation = await this.bannerValidationService.validateBannerId(
        id,
        'toggleBannerStatus',
      );
      if (!idValidation.isValid) {
        return idValidation.error;
      }

      const banner = await this.bannerModel.findById(id);

      if (!banner) {
        const error = new NotFoundException('Banner no encontrado');
        await this.bannerErrorService.logValidationError(
          id,
          'toggleBannerStatus',
          'banner_no_encontrado',
          { id },
        );
        return {
          data: null as any,
          message: 'Banner no encontrado',
          success: false,
        };
      }

      const newStatus = banner.estado === 'activo' ? 'inactivo' : 'activo';

      const updatedBanner = await this.bannerModel.findByIdAndUpdate(
        id,
        {
          estado: newStatus,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!updatedBanner) {
        const error = new Error('No se pudo actualizar el estado del banner');
        await this.bannerErrorService.logValidationError(
          id,
          'toggleBannerStatus',
          'error_cambio_estado',
          { currentStatus: banner.estado, newStatus },
        );
        return {
          data: null as any,
          message: 'No se pudo actualizar el estado del banner',
          success: false,
        };
      }

      return {
        data: updatedBanner,
        message: `Banner ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        id,
        'toggleBannerStatus',
      );
      return {
        data: null as any,
        message: `Error al cambiar el estado del banner: ${error}`,
        success: false,
      };
    }
  }

  getAvailableDimensions(): {
    [key: string]: { width: number; height: number };
  } {
    return this.dimensions;
  }
}
