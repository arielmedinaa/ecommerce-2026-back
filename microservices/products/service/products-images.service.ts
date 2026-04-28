import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsImage } from '../schemas/products-image.schema';
import { Product } from '../schemas/product.schemas';
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
  private readonly baseUrl = process.env.API_GATEWAY_URL;

  constructor(
    @InjectRepository(ProductsImage, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesWriteRepository: Repository<ProductsImage>,
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
  ) {
    this.ensureDirectoryExists();
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
      
      fs.writeFileSync(filePath, bufferData);
      const cdnUrl = `${this.baseUrl}products/images/${fileName}`;
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

    const filePath = path.join(this.imagesPath, image.nombre_archivo);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Archivo eliminado: ${image.nombre_archivo}`);
    }

    await this.productsImagesWriteRepository.delete(id);
    this.logger.log(`Imagen eliminada: ${id}`);
    return { data: image, message: 'Imagen eliminada exitosamente', success: true };
  }

  async deleteAllProductImages(productoCodigo: string): Promise<{data: ProductsImage[]; message: string; success: boolean}> {
    const images = await this.productsImagesReadRepository.find({
      where: { producto_codigo: productoCodigo }
    });

    for (const image of images) {
      const filePath = path.join(this.imagesPath, image.nombre_archivo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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

  // Simulación de subida a CDN AWS (futuro)
  private async uploadToAWSCDN(filePath: string, fileName: string): Promise<string> {
    // TODO: Implementar AWS S3 upload
    // Por ahora, simula la URL del CDN
    return `${this.baseUrl}/${fileName}`;
  }

  // Simulación de eliminación de CDN AWS (futuro)
  private async deleteFromAWSCDN(fileName: string): Promise<void> {
    // TODO: Implementar AWS S3 delete
    // Por ahora, solo log
    this.logger.log(`Simulación: Eliminando ${fileName} de AWS CDN`);
  }
}
