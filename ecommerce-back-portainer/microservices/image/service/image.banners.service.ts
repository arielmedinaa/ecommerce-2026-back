import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banners } from '../schemas/banners/banners.schema';
import { BannerValidationService } from './errors/image.spec';
import { BannerErrorService } from './errors/banner-error.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import * as os from 'os';
import { ImageStorageService } from '@shared/common/services/image-storage.service';

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
    @InjectRepository(Banners, 'WRITE_CONNECTION')
    private readonly bannerRepository: Repository<Banners>,
    private readonly bannerValidationService: BannerValidationService,
    private readonly bannerErrorService: BannerErrorService,
    private readonly imageStorage: ImageStorageService,
  ) {
    const configured =
      process.env.DIR_IMAGE ||
      '/home/appuser/Documents/projects/newEcommerce2026/imagesEcommerce/banners';
    const dockerHome = '/home/appuser';
    const isDocker =
      String(process.env.IS_DOCKER || '').toLowerCase() === 'true' ||
      String(process.env.RUN_MODE || '').toLowerCase() === 'all';
    const rawHome = os.homedir();
    // En Docker queremos que "~/" apunte al path montado por volumen (bajo /home/appuser),
    // así los archivos se reflejan en `ecommerce-2026-back/imagesEcommerce` del host.
    const homeForTilde = isDocker ? dockerHome : rawHome;
    // Expand "~" to homedir so paths are absolute and work across services/containers
    this.bannersDir =
      configured === '~'
        ? homeForTilde
        : configured.startsWith('~/')
          ? path.join(homeForTilde, configured.slice(2))
          : configured;
    if (!this.imageStorage.isS3()) {
      this.ensureDirectoryExists();
    }
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.bannersDir)) {
      fs.mkdirSync(this.bannersDir, { recursive: true });
    }
  }

  async uploadBanner(
    file: any,
    nombre: string,
    variante: string,
    creadoPor: string,
    modificadoPor: string,
    meta?: Record<string, any>,
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

      const existingBanner = await this.bannerRepository.findOne({
        where: { nombre },
      });
      if (existingBanner) {
        this.logger.error('YA EXISTE UN BANNER CON ESE NOMBRE');
        await this.bannerErrorService.logValidationError(
          existingBanner.id,
          'uploadBanner',
          'nombre_duplicado',
          { nombre, variante },
          creadoPor,
        );
        return {
          data: null as any,
          message: 'YA EXISTE UN BANNER CON ESE NOMBRE',
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
        id: bannerId,
        nombre,
        imagen: savedImages.desktop.fileName,
        variante,
        formato: 'webp',
        ruta: this.imageStorage.isS3()
          ? savedImages.desktop.key
          : savedImages.desktop.filePath,
        estado: 'activo',
        creadoPor,
        modificadoPor,
        dimensiones: savedImages,
        meta: meta || undefined,
      };

      const newEntity = this.bannerRepository.create(bannerData);
      const newBanner = await this.bannerRepository.save(newEntity);

      return {
        data: newBanner,
        message: 'BANNER SUBIDO EXITOSAMENTE',
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

  async uploadBannerFromS3(
    originalKey: string,
    nombre: string,
    variante: string,
    creadoPor: string,
    modificadoPor: string,
    meta?: Record<string, any>,
    contentType?: string,
  ): Promise<{ data: Banners; message: string; success: boolean }> {
    try {
      const existingBanner = await this.bannerRepository.findOne({
        where: { nombre },
      });
      if (existingBanner) {
        await this.bannerErrorService.logValidationError(
          existingBanner.id,
          'uploadBannerFromS3',
          'nombre_duplicado',
          { nombre, variante, originalKey },
          creadoPor,
        );
        return {
          data: null as any,
          message: 'YA EXISTE UN BANNER CON ESE NOMBRE',
          success: false,
        };
      }

      if (!this.imageStorage.isS3()) {
        return {
          data: null as any,
          message: 'uploadBannerFromS3 requiere IMAGE_STORAGE_PROVIDER=s3',
          success: false,
        };
      }

      // ----- Video (mp4): NO se procesa con Sharp; se guarda el archivo tal cual.
      const isVideo =
        /video\//i.test(contentType || '') || /\.mp4$/i.test(originalKey);
      if (isVideo) {
        return await this.saveVideoBannerFromS3(
          originalKey,
          nombre,
          variante,
          creadoPor,
          modificadoPor,
          meta,
        );
      }

      const original = await this.imageStorage.getObjectBuffer(originalKey);
      const bannerId = uuidv4();
      const baseFileName = `${bannerId}_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const savedImages = await this.processAndSaveImagesFromBuffer(
        original.buffer,
        baseFileName,
        bannerId,
        creadoPor,
      );

      const bannerData: Partial<Banners> = {
        id: bannerId,
        nombre,
        imagen: savedImages.desktop.fileName,
        variante,
        formato: 'webp',
        ruta: savedImages.desktop.key,
        estado: 'activo',
        creadoPor,
        modificadoPor,
        dimensiones: savedImages,
        meta: meta || undefined,
      };

      const newEntity = this.bannerRepository.create(bannerData);
      const newBanner = await this.bannerRepository.save(newEntity);
      await this.imageStorage.deleteObject(originalKey);

      return {
        data: newBanner,
        message: 'BANNER SUBIDO EXITOSAMENTE',
        success: true,
      };
    } catch (error) {
      await this.bannerErrorService.logMicroserviceError(
        error,
        'unknown',
        'uploadBannerFromS3',
        { nombre, variante, creadoPor, modificadoPor, originalKey },
        creadoPor,
      );
      return {
        data: null as any,
        message: `Error al subir el banner: ${error}`,
        success: false,
      };
    }
  }

  // Guarda un banner de VIDEO (mp4) sin procesarlo con Sharp: mueve el objeto
  // original de S3 a la ruta definitiva y apunta las 4 "dimensiones" a esa misma
  // key, para que GET /image/banner/:nombre/:device sirva el mp4 en cualquier device.
  private async saveVideoBannerFromS3(
    originalKey: string,
    nombre: string,
    variante: string,
    creadoPor: string,
    modificadoPor: string,
    meta?: Record<string, any>,
  ): Promise<{ data: Banners; message: string; success: boolean }> {
    const original = await this.imageStorage.getObjectBuffer(originalKey);
    const bannerId = uuidv4();
    const baseFileName = `${bannerId}_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const fileName = `${baseFileName}.mp4`;
    const key = this.imageStorage.buildKey(fileName);

    const put = await this.imageStorage.putObject({
      key,
      body: original.buffer,
      contentType: 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const entry = {
      fileName,
      key,
      filePath: null,
      width: null,
      height: null,
      url: put.url,
    };
    const savedImages: any = {
      desktop: entry,
      tablet: entry,
      mobile: entry,
      small: entry,
    };

    const bannerData: Partial<Banners> = {
      id: bannerId,
      nombre,
      imagen: fileName,
      variante,
      formato: 'mp4',
      ruta: key,
      estado: 'activo',
      creadoPor,
      modificadoPor,
      dimensiones: savedImages,
      meta: { ...(meta || {}), mediaType: 'video' },
    };

    const newEntity = this.bannerRepository.create(bannerData);
    const newBanner = await this.bannerRepository.save(newEntity);
    await this.imageStorage.deleteObject(originalKey);

    return {
      data: newBanner,
      message: 'BANNER (VIDEO) SUBIDO EXITOSAMENTE',
      success: true,
    };
  }

  private async processAndSaveImages(
    file: any,
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
        const key = this.imageStorage.buildKey(fileName);
        const filePath = path.join(this.bannersDir, fileName);

        try {
          const transformer = sharp(tempPath)
            .resize(dimension.width, dimension.height, {
              fit: 'cover',
              position: 'center',
            })
            .webp({ quality: 85 });

          let url: string | undefined;
          if (this.imageStorage.isS3()) {
            const buffer = await transformer.toBuffer();
            const put = await this.imageStorage.putObject({
              key,
              body: buffer,
              contentType: 'image/webp',
              cacheControl: 'public, max-age=31536000, immutable',
            });
            url = put.url;
          } else {
            await transformer.toFile(filePath);
          }

          savedImages[device] = {
            fileName,
            key,
            filePath: this.imageStorage.isS3() ? null : filePath,
            width: dimension.width,
            height: dimension.height,
            url: url || `/image/banner/${baseFileName.split('_')[1]}/${device}`,
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

      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      return savedImages;
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  private async processAndSaveImagesFromBuffer(
    buffer: Buffer,
    baseFileName: string,
    bannerId: string,
    creadoPor: string,
  ): Promise<any> {
    const savedImages: any = {};

    for (const [device, dimension] of Object.entries(this.dimensions)) {
      const fileName = `${baseFileName}_${device}.webp`;
      const key = this.imageStorage.buildKey(fileName);
      try {
        const out = await sharp(buffer)
          .resize(dimension.width, dimension.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toBuffer();

        const put = await this.imageStorage.putObject({
          key,
          body: out,
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        });

        savedImages[device] = {
          fileName,
          key,
          filePath: null,
          width: dimension.width,
          height: dimension.height,
          url: put.url,
        };
      } catch (processError) {
        await this.bannerErrorService.logFileProcessingError(
          bannerId,
          fileName,
          device,
          processError,
          'processAndSaveImagesFromBuffer',
          creadoPor,
        );
        throw processError;
      }
    }

    return savedImages;
  }

  async getBannerImage(
    nombre: string,
    device: string = 'desktop',
  ): Promise<{ kind: 'file' | 'url'; value: string; contentType?: string }> {
    try {
      const deviceValidation =
        await this.bannerValidationService.validateDevice(
          device,
          'getBannerImage',
        );
      if (!deviceValidation.isValid) {
        throw new BadRequestException(deviceValidation.error.message);
      }

      const banner = await this.bannerRepository.findOne({
        where: {
          nombre,
          estado: 'activo',
        },
      });

      this.logger.log(`Banner encontrado: ${banner ? 'SÍ' : 'NO'}`);
      if (banner) {
        this.logger.log(
          `ID del banner: ${banner.id}, nombre guardado: "${banner.nombre}"`,
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

      const deviceInfo = banner?.dimensiones?.[device];
      if (this.imageStorage.isS3()) {
        const key: string | undefined = deviceInfo?.key;
        let url: string | undefined =
          deviceInfo?.url ||
          (key ? this.imageStorage.publicUrlForKeyExternal(key) : undefined);
        if (key && this.imageStorage.shouldUseSignedUrls()) {
          url = await this.imageStorage.getSignedGetUrl(key);
        }
        if (!url) {
          const error = new NotFoundException(
            'Imagen del banner no encontrada',
          );
          await this.bannerErrorService.logValidationError(
            banner.id,
            'getBannerImage',
            'imagen_no_encontrada',
            { nombre, device, dimensiones: banner?.dimensiones },
          );
          throw error;
        }
        return { kind: 'url', value: url, contentType: 'image/webp' };
      }

      // Local filesystem mode
      const files = fs.readdirSync(this.bannersDir);
      const matchingFile = files.find(
        (f) =>
          f.includes(nombre.replace(/[^a-zA-Z0-9]/g, '_')) &&
          f.includes(`${device}.webp`),
      );

      if (!matchingFile) {
        this.logger.log(
          `No se encontró archivo para "${nombre}" con device "${device}"`,
        );
        const error = new NotFoundException('Imagen del banner no encontrada');
        await this.bannerErrorService.logValidationError(
          banner.id,
          'getBannerImage',
          'imagen_no_encontrada',
          { nombre, device, availableFiles: files },
        );
        throw error;
      }

      const filePath = path.join(this.bannersDir, matchingFile);
      return { kind: 'file', value: filePath };
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

  async getBannerFileBuffer(
    nombre: string,
    device: string = 'desktop',
  ): Promise<{ buffer: Buffer; contentType: string }> {
    // Modo local (no S3): resolvemos vía getBannerImage (path en disco).
    if (!this.imageStorage.isS3()) {
      const location = await this.getBannerImage(nombre, device);
      if (location.kind === 'file') {
        const filePath = location.value;
        if (!fs.existsSync(filePath))
          throw new NotFoundException('La imagen solicitada no existe');
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : ext === '.gif'
                ? 'image/gif'
                : ext === '.mp4'
                  ? 'video/mp4'
                  : 'image/webp';
        return { buffer: fs.readFileSync(filePath), contentType };
      }
    }

    // S3 mode: derive key from DB (sin pasar por getBannerImage, que tira
    // NotFound si `dimensiones` está NULL antes de poder aplicar el fallback).
    const banner = await this.bannerRepository.findOne({
      where: { nombre, estado: 'activo' },
    });
    if (!banner) throw new NotFoundException('Banner no encontrado');
    let key: string | undefined = banner?.dimensiones?.[device]?.key;

    // Fallback: si `dimensiones` no tiene la key del device (p.ej. banners cuyo
    // JSON quedó NULL), la derivamos desde `ruta` (apunta al *_desktop.webp).
    // Los 4 archivos por device existen en S3 con el mismo prefijo.
    if (!key && banner?.ruta) {
      const ruta = String(banner.ruta);
      if (/_(?:desktop|tablet|mobile|small)\.[a-z0-9]+$/i.test(ruta)) {
        key = ruta.replace(/_(?:desktop|tablet|mobile|small)(\.[a-z0-9]+)$/i, `_${device}$1`);
      } else {
        // Video u otros formatos sin sufijo de device: servimos `ruta` tal cual.
        key = ruta;
      }
    }

    if (!key) throw new NotFoundException('Imagen del banner no encontrada');
    try {
      const obj = await this.imageStorage.getObjectBuffer(key);
      return { buffer: obj.buffer, contentType: obj.contentType || 'image/webp' };
    } catch {
      // Si la variante puntual no existe en S3, caemos al desktop como último recurso.
      const fallbackKey = key.replace(/_(?:tablet|mobile|small)(\.[a-z0-9]+)$/i, '_desktop$1');
      if (fallbackKey !== key) {
        const obj = await this.imageStorage.getObjectBuffer(fallbackKey);
        return { buffer: obj.buffer, contentType: obj.contentType || 'image/webp' };
      }
      throw new NotFoundException('Imagen del banner no encontrada');
    }
  }

  async getAllBanners(fields?: string[]): Promise<{
    data: Banners[];
    message: string;
    success: boolean;
  }> {
    try {
      let selectOptions: any = undefined;
      if (fields && fields.length > 0) {
        selectOptions = fields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as any);
      }

      const banners = await this.bannerRepository.find({
        select: selectOptions,
        order: { createdAt: 'DESC' },
      });

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
      const idValidation = await this.bannerValidationService.validateBannerId(
        id,
        'getBannerById',
      );
      if (!idValidation.isValid) {
        return idValidation.error;
      }

      const banner = await this.bannerRepository.findOne({ where: { id } });
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
      const banner = await this.bannerRepository.findOne({ where: { id } });
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

      const baseFileName = `${banner.id}_${banner.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
      for (const device of Object.keys(this.dimensions)) {
        const fileName = `${baseFileName}_${device}.webp`;
        const key = this.imageStorage.buildKey(fileName);

        if (this.imageStorage.isS3()) {
          await this.imageStorage.deleteObject(key);
          continue;
        }

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

      await this.bannerRepository.delete(id);
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

      const banner = await this.bannerRepository.findOne({ where: { id } });

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
      await this.bannerRepository.update(id, { estado: newStatus });

      const updatedBanner = await this.bannerRepository.findOne({
        where: { id },
      });

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
