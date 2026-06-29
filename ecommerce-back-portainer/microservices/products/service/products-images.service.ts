import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsImage } from '../schemas/products-image.schema';
import { Product } from '../schemas/product.schemas';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
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
export class ProductsImagesService {
  private readonly logger = new Logger(ProductsImagesService.name);
  private readonly imagesPath = '/home/appuser/Documents/projects/newEcommerce2026/imagesEcommerce/productos';
  private readonly baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');

  constructor(
    @InjectRepository(ProductsImage, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesWriteRepository: Repository<ProductsImage>,
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    private readonly imageStorage: ImageStorageService,
  ) {
    this.ensureDirectoryExists();
  }

  /** S3 key bajo la que se guardan las imágenes de producto (mismo bucket que banners). */
  private productKey(fileName: string): string {
    return `products/images/${fileName}`;
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath, { recursive: true });
      this.logger.log(`Directorio creado: ${this.imagesPath}`);
    }
  }

  async uploadProductImage(
    productoCodigo: string,
    files: MulterFile | MulterFile[],
    orden: number = 0,
    principal: boolean = false,
    userId?: string
  ): Promise<{data: ProductsImage[]; message: string; success: boolean}> {
    const product = await this.productReadRepository.findOne({
      where: { codigo_articulo: productoCodigo }
    });

    if (!product) {
      throw new NotFoundException(`Producto con código ${productoCodigo} no encontrado`);
    }

    const filesArray = Array.isArray(files) ? files : [files];
    const results: ProductsImage[] = [];
    for (const file of filesArray) {
      if (principal) {
        await this.productsImagesWriteRepository.update(
          { producto_codigo: productoCodigo },
          { principal: false }
        );
        principal = false;
      }

      const fileExtension = path.extname(file.originalname);
      const fileName = `${productoCodigo}_${Date.now()}${fileExtension}`;
      const filePath = path.join(this.imagesPath, fileName);

      let bufferData: Buffer;
      if (Buffer.isBuffer(file.buffer)) {
        bufferData = file.buffer;
      } else if (file.buffer && typeof file.buffer === 'object') {
        if ('data' in file.buffer) {
          const dataProperty = (file.buffer as any).data;
          if (Buffer.isBuffer(dataProperty)) {
            bufferData = dataProperty;
          } else if (typeof dataProperty === 'string') {
            bufferData = Buffer.from(dataProperty, 'base64');
          } else if (Array.isArray(dataProperty)) {
            bufferData = Buffer.from(dataProperty);
          } else {
            bufferData = Buffer.from(JSON.stringify(file.buffer));
          }
        } else {
          bufferData = Buffer.from(JSON.stringify(file.buffer));
        }
      } else if (typeof file.buffer === 'string') {
        bufferData = Buffer.from(file.buffer, 'base64');
      } else {
        throw new Error(`Formato de archivo inválido: ${typeof file.buffer}`);
      }
      
      if (this.imageStorage.isS3()) {
        await this.imageStorage.putObject({
          key: this.productKey(fileName),
          body: bufferData,
          contentType: 'image/webp',
          cacheControl: 'public, max-age=86400',
        });
      } else {
        fs.writeFileSync(filePath, bufferData);
      }
      const cdnUrl = `${this.baseUrl}/products/images/${fileName}`;
      const productImage = this.productsImagesWriteRepository.create({
        producto_codigo: productoCodigo,
        url_imagen: cdnUrl,
        nombre_archivo: fileName,
        orden,
        principal,
        created_by: userId,
      });

      const savedImage = await this.productsImagesWriteRepository.save(productImage);
      this.logger.log(`Imagen subida para producto ${productoCodigo}: ${fileName}`);
      
      results.push(savedImage);
    }

    return { data: results, message: `${results.length} imagen(es) subida(s) exitosamente`, success: true };
  }

  async getImagesByProduct(productoCodigo: string): Promise<ProductsImage[]> {
    return await this.productsImagesReadRepository.find({
      where: {
        producto_codigo: productoCodigo,
        activo: true
      },
      order: { orden: 'ASC', id: 'ASC' }
    });
  }

  /**
   * Devuelve el binario de una imagen de producto para que el gateway lo sirva.
   * En S3 lee del bucket; en modo local lee del disco (compatibilidad). Espejo de
   * `BannerService.getBannerFileBuffer`.
   */
  async getProductImageFile(
    filename: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (this.imageStorage.isS3()) {
      const { buffer, contentType } = await this.imageStorage.getObjectBuffer(
        this.productKey(filename),
      );
      return { buffer, contentType: contentType || 'image/webp' };
    }

    const filePath = path.join(this.imagesPath, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    return { buffer: fs.readFileSync(filePath), contentType: 'image/webp' };
  }

  async updateImage(
    id: number,
    updates: Partial<ProductsImage>,
    userId?: string
  ): Promise<{data: ProductsImage; message: string; success: boolean}> {
    const image = await this.productsImagesWriteRepository.findOne({ where: { id } });
    
    if (!image) {
      throw new NotFoundException(`Imagen con id ${id} no encontrada`);
    }
    if (updates.principal) {
      await this.productsImagesWriteRepository.update(
        { producto_codigo: image.producto_codigo },
        { principal: false }
      );
    }

    Object.assign(image, updates, { updated_by: userId });
    const savedImage = await this.productsImagesWriteRepository.save(image);
    return { data: savedImage, message: 'Imagen actualizada exitosamente', success: true };
  }

  async deleteImage(id: number): Promise<{data: ProductsImage; message: string; success: boolean}> {
    const image = await this.productsImagesWriteRepository.findOne({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Imagen con id ${id} no encontrada`);
    }

    await this.removeStoredFile(image.nombre_archivo);

    await this.productsImagesWriteRepository.delete(id);
    this.logger.log(`Imagen eliminada: ${id}`);
    return { data: image, message: 'Imagen eliminada exitosamente', success: true };
  }

  async deleteAllProductImages(productoCodigo: string): Promise<{data: ProductsImage[]; message: string; success: boolean}> {
    const images = await this.productsImagesReadRepository.find({
      where: { producto_codigo: productoCodigo }
    });

    for (const image of images) {
      await this.removeStoredFile(image.nombre_archivo);
    }

    await this.productsImagesWriteRepository.delete({ producto_codigo: productoCodigo });
    this.logger.log(`Todas las imágenes eliminadas para producto: ${productoCodigo}`);
    return { data: images, message: 'Todas las imágenes eliminadas exitosamente', success: true };
  }

  async reorderImages(productoCodigo: string, imageOrders: { id: number; orden: number }[]): Promise<void> {
    for (const { id, orden } of imageOrders) {
      await this.productsImagesWriteRepository.update(
        { id, producto_codigo: productoCodigo },
        { orden }
      );
    }
    this.logger.log(`Imágenes reordenadas para producto: ${productoCodigo}`);
  }

  /**
   * Borra el archivo físico de una imagen de producto: del bucket S3 si está en
   * modo S3, o del disco local en caso contrario. No toca la BD.
   */
  private async removeStoredFile(fileName?: string): Promise<void> {
    if (!fileName) return;

    if (this.imageStorage.isS3()) {
      await this.imageStorage.deleteObject(this.productKey(fileName));
      this.logger.log(`Objeto S3 eliminado: ${this.productKey(fileName)}`);
      return;
    }

    const filePath = path.join(this.imagesPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Archivo eliminado: ${fileName}`);
    }
  }
}
