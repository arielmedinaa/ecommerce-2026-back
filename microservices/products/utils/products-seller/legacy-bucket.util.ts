import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as sharp from 'sharp';

// Sube las imágenes de productos de proveedor también al bucket del
// ecommerce viejo (el que sigue en producción en centralshop.com.py),
// replicando el pipeline de recursos/dos.js + controlador/almacen.js de
// ese proyecto: 5 tamaños en webp, ACL público, sin firma de URL — el
// storefront viejo arma la URL final como CDN_BUCKET + CARPETA_STORE_BUCKET
// + esta clave relativa.
const SIZES = [1000, 600, 300, 100, 60] as const;
const FORMATO = 'webp';

export type LegacyImageUrls = Record<string, string>;

@Injectable()
export class LegacyBucketUtil {
  private readonly logger = new Logger(LegacyBucketUtil.name);
  private readonly bucket = process.env.LEGACY_S3_BUCKET;
  private readonly storeFolder = (process.env.LEGACY_S3_STORE_FOLDER || 'ecommerce/store/').replace(/^\/+/, '');
  private readonly s3: S3Client | null;

  constructor() {
    const endpoint = process.env.LEGACY_S3_ENDPOINT;
    const region = process.env.LEGACY_S3_REGION;
    const accessKeyId = process.env.LEGACY_S3_KEY_ID;
    const secretAccessKey = process.env.LEGACY_S3_SECRET;
    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn('Credenciales del bucket legacy no configuradas: no se subirán imágenes al ecommerce viejo.');
      this.s3 = null;
      return;
    }
    this.s3 = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } });
  }

  isEnabled(): boolean {
    return this.s3 !== null;
  }

  // codigoArticulo + campo identifican de forma estable la carpeta destino,
  // así una corrección/reenvío pisa las mismas 5 claves en vez de acumular
  // basura huérfana en el bucket (a diferencia del "variante" aleatorio
  // que usaba el proyecto viejo).
  private relativeKeys(codigoArticulo: string, campo: string): LegacyImageUrls {
    const urls: LegacyImageUrls = {};
    for (const size of SIZES) urls[String(size)] = `${codigoArticulo}/${campo}/${size}.${FORMATO}`;
    return urls;
  }

  async uploadSizes(buffer: Buffer, codigoArticulo: string, campo: string): Promise<{ formato: string; url: LegacyImageUrls } | null> {
    if (!this.s3) return null;
    try {
      const relative = this.relativeKeys(codigoArticulo, campo);
      await Promise.all(
        SIZES.map(async (size) => {
          const resized = await sharp(buffer)
            .webp({ quality: 90 })
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          await this.s3!.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: this.storeFolder + relative[String(size)],
              Body: resized,
              ACL: 'public-read',
              ContentType: 'image/webp',
              CacheControl: 'public, max-age=31536000, immutable',
            }),
          );
        }),
      );
      return { formato: FORMATO, url: relative };
    } catch (err: any) {
      this.logger.warn(`No se pudo subir la imagen al bucket legacy (${codigoArticulo}/${campo}): ${err?.message || err}`);
      return null;
    }
  }

  // Para reconstruir el descriptor sin volver a subir nada — usado por el
  // sync a Mongo, que asume (best-effort) que la imagen ya fue subida por
  // uploadSizes en algún momento anterior (import, corrección o backfill).
  describe(codigoArticulo: string, campo: string): { formato: string; url: LegacyImageUrls } {
    return { formato: FORMATO, url: this.relativeKeys(codigoArticulo, campo) };
  }
}
