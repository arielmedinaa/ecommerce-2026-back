import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { assertSafeExternalUrl, UnsafeUrlError } from '@shared/common/utils/ssrf-guard';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { LegacyBucketUtil } from './legacy-bucket.util';

const MAX_BYTES = 1 * 1024 * 1024; // 1MB
const FETCH_TIMEOUT_MS = 8000;

export type SellerImageValidationResult = {
  success: boolean;
  url: string | null;
  message: string;
};

@Injectable()
export class SellerImageValidatorUtil {
  private readonly logger = new Logger(SellerImageValidatorUtil.name);
  private readonly baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');

  constructor(
    private readonly imageStorage: ImageStorageService,
    private readonly legacyBucket: LegacyBucketUtil,
  ) {}

  private sellerImageKey(idProveedor: number, codigoArticulo: string, campo: string): string {
    return `products/seller-images/${idProveedor}/${codigoArticulo}/${campo}-${Date.now()}.webp`;
  }

  private async convertAndUpload(
    buffer: Buffer,
    idProveedor: number,
    codigoArticulo: string,
    campo: string,
  ): Promise<SellerImageValidationResult> {
    if (buffer.byteLength > MAX_BYTES) {
      return { success: false, url: null, message: 'La imagen pesa más de 1MB.' };
    }

    try {
      const webpBuffer = await sharp(buffer).webp({ quality: 90 }).toBuffer();
      if (!this.imageStorage.isS3()) {
        return { success: false, url: null, message: 'El almacenamiento de imágenes no está disponible en este momento.' };
      }
      const key = this.sellerImageKey(idProveedor, codigoArticulo, campo);
      await this.imageStorage.putObject({
        key,
        body: webpBuffer,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const proxyUrl = `${this.baseUrl}/products/sellers/image-file?key=${encodeURIComponent(key)}`;
      if (this.legacyBucket.isEnabled()) {
        await this.legacyBucket.uploadSizes(buffer, codigoArticulo, campo);
      }

      return { success: true, url: proxyUrl, message: 'Imagen validada correctamente.' };
    } catch (err: any) {
      this.logger.warn(`No se pudo procesar la imagen del proveedor: ${err?.message || err}`);
      return { success: false, url: null, message: 'El archivo no es una imagen válida.' };
    }
  }

  async validateAndUploadFromUrl(
    url: string,
    idProveedor: number,
    codigoArticulo: string,
    campo: string,
  ): Promise<SellerImageValidationResult> {
    let safeUrl: URL;
    try {
      safeUrl = await assertSafeExternalUrl(url);
    } catch (err) {
      const message = err instanceof UnsafeUrlError ? err.message : 'URL inválida.';
      return { success: false, url: null, message };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const upstream = await fetch(safeUrl.toString(), { signal: controller.signal });
      if (!upstream.ok) {
        return { success: false, url: null, message: 'No se pudo descargar la imagen desde la URL indicada.' };
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return { success: false, url: null, message: 'La URL no apunta a una imagen.' };
      }

      const contentLength = Number(upstream.headers.get('content-length') || 0);
      if (contentLength && contentLength > MAX_BYTES) {
        return { success: false, url: null, message: 'La imagen pesa más de 1MB.' };
      }

      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return await this.convertAndUpload(buffer, idProveedor, codigoArticulo, campo);
    } catch {
      return { success: false, url: null, message: 'No se pudo descargar la imagen desde la URL indicada.' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async validateAndUploadFromBuffer(
    buffer: Buffer,
    idProveedor: number,
    codigoArticulo: string,
    campo: string,
  ): Promise<SellerImageValidationResult> {
    return this.convertAndUpload(buffer, idProveedor, codigoArticulo, campo);
  }
}
