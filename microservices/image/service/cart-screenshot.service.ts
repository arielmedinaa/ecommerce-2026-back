import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartScreenshot } from '../schemas/cart-screenshots/cart-screenshot.schema';
import { ImageStorageService } from '@shared/common/services/image-storage.service';

@Injectable()
export class CartScreenshotService {
  private readonly logger = new Logger(CartScreenshotService.name);

  constructor(
    @InjectRepository(CartScreenshot, 'WRITE_CONNECTION')
    private readonly repository: Repository<CartScreenshot>,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async saveFromS3(
    key: string,
    cartCodigo: string,
  ): Promise<{ data: CartScreenshot | null; message: string; success: boolean }> {
    try {
      const imageUrl = this.imageStorage.publicUrlForKeyExternal(key);
      const entity = this.repository.create({
        cartCodigo: String(cartCodigo),
        imageUrl,
        imageKey: key,
      });
      const saved = await this.repository.save(entity);
      return { data: saved, message: 'Captura guardada exitosamente', success: true };
    } catch (error: any) {
      this.logger.error(`Error guardando captura de carrito ${cartCodigo}: ${error.message}`);
      return { data: null, message: error.message || 'Error al guardar la captura', success: false };
    }
  }

  async getByCartCodigo(
    cartCodigo: string,
  ): Promise<{ data: CartScreenshot | null; message: string; success: boolean }> {
    try {
      const record = await this.repository.findOne({
        where: { cartCodigo: String(cartCodigo) },
        order: { createdAt: 'DESC' },
      });
      return { data: record || null, message: 'Ok', success: true };
    } catch (error: any) {
      this.logger.error(`Error obteniendo captura del carrito ${cartCodigo}: ${error.message}`);
      return { data: null, message: error.message || 'Error al obtener la captura', success: false };
    }
  }
}
