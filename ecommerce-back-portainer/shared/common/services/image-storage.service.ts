import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

type StorageProvider = 'local' | 's3';

function asBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function streamToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.from('');
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  // AWS SDK v3 returns Readable stream in Node.
  const readable = body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class ImageStorageService implements OnModuleInit {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly provider: StorageProvider;
  private readonly bucket: string;
  private readonly keyPrefix: string;
  private readonly cdnBaseUrl?: string;
  private readonly s3?: S3Client;
  private readonly ensureBucket: boolean;
  private readonly endpoint?: string;
  private readonly signedUrlsEnabled: boolean;
  private readonly signedUrlsTtlSeconds: number;

  constructor() {
    this.provider = (process.env.IMAGE_STORAGE_PROVIDER as StorageProvider) || 'local';
    this.bucket = process.env.IMAGE_S3_BUCKET || 'ecommerce-images';
    this.keyPrefix = (process.env.IMAGE_S3_KEY_PREFIX || 'banners').replace(/^\/+|\/+$/g, '');
    this.cdnBaseUrl = process.env.IMAGE_CDN_BASE_URL
      ? stripTrailingSlash(process.env.IMAGE_CDN_BASE_URL)
      : undefined;
    this.ensureBucket = asBool(process.env.IMAGE_S3_ENSURE_BUCKET, true);
    this.endpoint = process.env.IMAGE_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT;
    this.signedUrlsEnabled = asBool(process.env.IMAGE_S3_SIGNED_URLS, false);
    this.signedUrlsTtlSeconds = Number(process.env.IMAGE_S3_SIGNED_URL_TTL_SECONDS || 300);

    if (this.provider === 's3') {
      const region = process.env.IMAGE_S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'test';
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'test';

      this.s3 = new S3Client({
        region,
        endpoint: this.endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.provider !== 's3' || !this.s3 || !this.ensureBucket) return;

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`S3 bucket creado/asegurado: ${this.bucket}`);
      } catch (createErr: any) {
        this.logger.warn(`No se pudo asegurar bucket S3 "${this.bucket}": ${createErr?.message || createErr}`);
      }
    }
  }

  isS3(): boolean {
    return this.provider === 's3';
  }

  shouldUseSignedUrls(): boolean {
    return this.isS3() && this.signedUrlsEnabled;
  }

  buildKey(fileName: string): string {
    return `${this.keyPrefix}/${fileName}`.replace(/^\/+/, '');
  }

  publicUrlForKey(key: string): string {
    if (this.cdnBaseUrl) return `${this.cdnBaseUrl}/${key}`;
    if (!this.endpoint) {
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
    return `${stripTrailingSlash(this.endpoint)}/${this.bucket}/${key}`;
  }


  publicUrlForKeyExternal(key: string): string {
    const externalBase = process.env.IMAGE_CDN_EXTERNAL_BASE_URL
      ? stripTrailingSlash(process.env.IMAGE_CDN_EXTERNAL_BASE_URL)
      : process.env.IMAGE_CDN_BASE_URL
        ? stripTrailingSlash(process.env.IMAGE_CDN_BASE_URL)
      : process.env.IMAGE_S3_EXTERNAL_BASE_URL
        ? stripTrailingSlash(process.env.IMAGE_S3_EXTERNAL_BASE_URL)
        : undefined;

    if (externalBase) return `${externalBase}/${key}`;
    return this.publicUrlForKey(key);
  }

  async putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<{ key: string; url: string }> {
    if (this.provider !== 's3' || !this.s3) {
      throw new Error('ImageStorageService: provider != s3 (no soporta putObject)');
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      }),
    );

    return { key: params.key, url: this.publicUrlForKeyExternal(params.key) };
  }

  async getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string | undefined }> {
    if (this.provider !== 's3' || !this.s3) {
      throw new Error('ImageStorageService: provider != s3 (no soporta getObjectBuffer)');
    }

    const resp = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const buffer = await streamToBuffer(resp.Body);
    return { buffer, contentType: resp.ContentType };
  }

  async getSignedGetUrl(key: string): Promise<string> {
    if (this.provider !== 's3' || !this.s3) {
      throw new Error('ImageStorageService: provider != s3 (no soporta getSignedGetUrl)');
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const expiresIn = Number.isFinite(this.signedUrlsTtlSeconds) && this.signedUrlsTtlSeconds > 0
      ? this.signedUrlsTtlSeconds
      : 300;

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    if (this.provider !== 's3' || !this.s3) return;
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: any) {
      this.logger.warn(`No se pudo borrar objeto S3 "${key}": ${err?.message || err}`);
    }
  }
}
