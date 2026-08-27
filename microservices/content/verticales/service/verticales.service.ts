import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vertical } from '../schemas/verticales.schemas';
import { Repository } from 'typeorm';
import { VerticalValidation } from './valid/vertical.validation';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class VerticalesService {
  private readonly logger = new Logger(VerticalesService.name);
  private verticalCache: Map<string, { data: Vertical[]; timestamp: number }> =
    new Map();
  private readonly cacheTTL = 30 * 1000;
  private readonly imagesPath = '/home/appuser/Documents/projects/newEcommerce2026/imagesEcommerce/verticales';
  private readonly baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');

  constructor(
    @InjectRepository(Vertical, 'WRITE_CONNECTION')
    private readonly verticalRepository: Repository<Vertical>,
    @InjectRepository(Vertical, 'READ_CONNECTION')
    private readonly verticalRepositoryRead: Repository<Vertical>,
    private readonly verticalValidation: VerticalValidation,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async create(
    vertical: any,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    const validation = await this.verticalValidation.validateVertical(vertical);
    if (!validation.isValid) {
      this.logger.error(
        'Error de validación al crear vertical',
        validation.error,
      );
      return {
        data: null,
        message: validation.error,
        success: false,
      };
    }

    try {
      const result = await this.verticalRepository.save(vertical);
      this.invalidateCache();

      return {
        data: result,
        message: 'VERTICAL CREADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al crear vertical', error);
      return {
        data: null,
        message: 'ERROR AL CREAR VERTICAL',
        success: false,
      };
    }
  }

  async findAll(filters: any = {}): Promise<{
    data: Vertical[];
    message: string;
    success: boolean;
    total?: number;
  }> {
    const validation = await this.verticalValidation.validateFilters(filters);
    if (!validation.isValid) {
      this.logger.error('Error de validación en filtros', validation.error);
      return {
        data: [],
        message: validation.error,
        success: false,
        total: 0,
      };
    }

    const cacheKey = `vertical_cache_${JSON.stringify(filters)}`;
    const now = Date.now();
    const cached = this.verticalCache.get(cacheKey);

    if (cached && now - cached.timestamp < this.cacheTTL) {
      return {
        data: cached.data,
        message: 'VERTICALES OBTENIDAS DESDE CACHE',
        success: true,
        total: cached.data.length,
      };
    }

    try {
      const allowedKeys = ['id', 'nombre', 'url', 'activo', 'logo_url'];
      const whereFilters: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (filters?.[key] !== undefined) whereFilters[key] = filters[key];
      }
      const safeTake = Number(filters?.limit) > 0 ? Math.min(Number(filters.limit), 200) : 100;
      const result = await this.verticalRepositoryRead.find({
        where: whereFilters,
        take: safeTake,
      });
      if (!result || result.length === 0) {
        return {
          data: [],
          message: 'NO SE ENCONTRARON VERTICALES',
          success: false,
          total: 0,
        };
      }

      this.verticalCache.set(cacheKey, {
        data: result,
        timestamp: now,
      });

      return {
        data: result,
        message: 'VERTICALES OBTENIDAS CON ÉXITO',
        success: true,
        total: result.length,
      };
    } catch (error) {
      this.logger.error('Error al obtener verticales', error);
      return {
        data: [],
        message: 'ERROR AL OBTENER VERTICALES',
        success: false,
        total: 0,
      };
    }
  }

  async findOne(
    id: number,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    try {
      const result = await this.verticalRepositoryRead.findOne({
        where: { id },
      });

      if (!result) {
        return {
          data: null,
          message: 'VERTICAL NO ENCONTRADA',
          success: false,
        };
      }

      return {
        data: result,
        message: 'VERTICAL OBTENIDA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al obtener vertical', error);
      return {
        data: null,
        message: 'ERROR AL OBTENER VERTICAL',
        success: false,
      };
    }
  }

  async update(
    id: number,
    verticalData: any,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    const verticalValidation =
      await this.verticalValidation.validateVertical(verticalData);
    if (!verticalValidation.isValid) {
      return {
        data: null,
        message: verticalValidation.error,
        success: false,
      };
    }

    try {
      const result = await this.verticalRepository.update(id, verticalData);
      if (result.affected === 0) {
        return {
          data: null,
          message: 'VERTICAL NO ENCONTRADA PARA ACTUALIZAR',
          success: false,
        };
      }

      this.invalidateCache();
      const updatedVertical = await this.verticalRepositoryRead.findOne({
        where: { id },
      });

      return {
        data: updatedVertical,
        message: 'VERTICAL ACTUALIZADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al actualizar vertical', error);
      return {
        data: null,
        message: 'ERROR AL ACTUALIZAR VERTICAL',
        success: false,
      };
    }
  }

  async remove(id: number): Promise<{ message: string; success: boolean }> {
    try {
      const result = await this.verticalRepository.delete(id);
      if (result.affected === 0) {
        return {
          message: 'VERTICAL NO ENCONTRADA PARA ELIMINAR',
          success: false,
        };
      }

      this.invalidateCache();

      return {
        message: 'VERTICAL ELIMINADA CON ÉXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al eliminar vertical', error);
      return {
        message: 'ERROR AL ELIMINAR VERTICAL',
        success: false,
      };
    }
  }

  async uploadLogo(
    id: number,
    file: MulterFile,
  ): Promise<{ data: Vertical; message: string; success: boolean }> {
    const vertical = await this.verticalRepositoryRead.findOne({ where: { id } });
    if (!vertical) {
      throw new NotFoundException(`Vertical con id ${id} no encontrada`);
    }

    let bufferData: Buffer;
    if (Buffer.isBuffer(file.buffer)) {
      bufferData = file.buffer;
    } else if (file.buffer && typeof file.buffer === 'object' && 'data' in file.buffer) {
      const dataProperty = (file.buffer as any).data;
      bufferData = Buffer.isBuffer(dataProperty)
        ? dataProperty
        : typeof dataProperty === 'string'
          ? Buffer.from(dataProperty, 'base64')
          : Buffer.from(dataProperty);
    } else if (typeof file.buffer === 'string') {
      bufferData = Buffer.from(file.buffer, 'base64');
    } else {
      throw new Error(`Formato de archivo inválido: ${typeof file.buffer}`);
    }

    const webpBuffer = await sharp(bufferData)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    const nombreSanitizado = vertical.nombre.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${uuidv4()}.webp`;

    let url: string;
    if (this.imageStorage.isS3()) {
      const keyPrefix = (process.env.IMAGE_S3_VERTICALES_KEY_PREFIX || 'verticales').replace(/^\/+|\/+$/g, '');
      const key = `${keyPrefix}/${nombreSanitizado}/${fileName}`;
      await this.imageStorage.putObject({
        key,
        body: webpBuffer,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=86400',
      });
      // No usar result.url (apunta directo al bucket, que es privado y da 403).
      // Servir siempre vía el proxy del gateway, igual que banners/productos.
      url = `${this.baseUrl}/content/vertical/logo/${nombreSanitizado}/${fileName}`;
    } else {
      const dir = path.join(this.imagesPath, nombreSanitizado);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, fileName), webpBuffer);
      url = `${this.baseUrl}/content/vertical/logo/${nombreSanitizado}/${fileName}`;
    }

    await this.verticalRepository.update(id, { logo_url: url });
    this.invalidateCache();
    const updated = await this.verticalRepositoryRead.findOne({ where: { id } });

    return { data: updated, message: 'LOGO SUBIDO CON ÉXITO', success: true };
  }

  async getLogoFile(
    nombreSanitizado: string,
    fileName: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (
      !nombreSanitizado ||
      !fileName ||
      nombreSanitizado.includes('..') ||
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (this.imageStorage.isS3()) {
      const keyPrefix = (process.env.IMAGE_S3_VERTICALES_KEY_PREFIX || 'verticales').replace(/^\/+|\/+$/g, '');
      const key = `${keyPrefix}/${nombreSanitizado}/${fileName}`;
      try {
        const { buffer, contentType } = await this.imageStorage.getObjectBuffer(key);
        return { buffer, contentType: contentType || 'image/webp' };
      } catch (err: any) {
        this.logger.warn(`No se pudo leer logo de vertical desde S3 (key="${key}"): ${err?.message || err}`);
        throw new NotFoundException('Logo no encontrado');
      }
    }

    const filePath = path.join(this.imagesPath, nombreSanitizado, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Logo no encontrado');
    }

    return { buffer: fs.readFileSync(filePath), contentType: 'image/webp' };
  }

  private invalidateCache(): void {
    this.verticalCache.clear();
  }
}
