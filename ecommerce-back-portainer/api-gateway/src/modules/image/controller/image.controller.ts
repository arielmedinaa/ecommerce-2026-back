import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Res,
  HttpStatus,
  Logger,
  Inject,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Banners')
@Controller('image')
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor(
    @Inject('IMAGE_SERVICE') private readonly imageClient: ClientProxy
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('banner/upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'fileMobile', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './temp',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          
          const allowedMimes = ['image/webp', 'video/mp4'];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Solo se permiten imágenes .webp o video mp4'), false);
          }
        },
        limits: {
          
          fileSize: 60 * 1024 * 1024,
        },
      },
    )
  )

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subir un nuevo banner' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Banner subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en la validación' })
  async uploadBanner(
    @UploadedFiles() files: { file?: any[]; fileMobile?: any[] },
    @Body() body: {
      nombre: string;
      variante: string;
      creadoPor: string;
      modificadoPor: string;
      meta?: any;
      fechaDesde?: string;
      fechaHasta?: string;
    }
  ) {
    const file = files?.file?.[0];
    const fileMobile = files?.fileMobile?.[0];
    try {
      if (!file) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Falta el archivo "file" (desktop)',
        };
      }
      this.logger.log(`Uploading banner: ${body.nombre}`);
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
      const endpoint = process.env.IMAGE_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT;
      const bucket = process.env.IMAGE_S3_BUCKET || 'ecommerce-images';
      const originalKeyPrefix = (process.env.IMAGE_S3_ORIGINAL_KEY_PREFIX || 'uploads/banners').replace(/^\/+|\/+$/g, '');

      if (!endpoint) {
        throw new Error('IMAGE_S3_ENDPOINT no está configurado (necesario para LocalStack)');
      }

      let meta: any = body.meta;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = undefined;
        }
      }

      const s3 = new S3Client({
        region,
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
        },
      });

      const putToS3 = async (f: any) => {
        const key = `${originalKeyPrefix}/${uuidv4()}_${f.filename}`;
        const buffer = fs.readFileSync(f.path);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: f.mimetype || 'image/webp',
            CacheControl: 'private, max-age=0, no-cache',
          }),
        );
        return key;
      };

      const originalKey = await putToS3(file);
      const originalKeyMobile = fileMobile ? await putToS3(fileMobile) : undefined;

      const payload = {
        key: originalKey,
        keyMobile: originalKeyMobile,
        nombre: body.nombre,
        variante: body.variante,
        creadoPor: body.creadoPor,
        modificadoPor: body.modificadoPor,
        meta,
        contentType: file.mimetype,
        fechaDesde: body.fechaDesde || null,
        fechaHasta: body.fechaHasta || null,
      };

      const pattern = { cmd: 'upload_banner_from_s3' };
      const result = await firstValueFrom(this.imageClient.send(pattern, payload));

      try {
        if (file?.path) fs.unlinkSync(file.path);
        if (fileMobile?.path) fs.unlinkSync(fileMobile.path);
      } catch {}

      return result;
    } catch (error) {
      this.logger.error(`Error uploading banner: ${error.message}`);
      try {
        if (file?.path) fs.unlinkSync(file.path);
        if (fileMobile?.path) fs.unlinkSync(fileMobile.path);
      } catch {}
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al subir el banner',
        error: error.message
      };
    }
  }

  @Get('banner/:nombre/:device')
  @ApiOperation({ summary: 'Obtener imagen de banner por dispositivo' })
  @ApiResponse({ status: 200, description: 'Imagen del banner' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  async getBanner(
    @Param('nombre') nombre: string,
    @Param('device') device: string = 'desktop',
    @Res() res: Response
  ) {
    try {
      this.logger.log(`Getting banner image: ${nombre} - ${device}`);
      const pattern = { cmd: 'get_banner_file' };
      const payload = { nombre, device };
      const result = await this.imageClient.send(pattern, payload).toPromise();
      if (result && result.success && result.data && result.data.buffer) {
        const contentType = result.data.contentType || 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        const raw = result.data.buffer as any;
        const buf = Buffer.isBuffer(raw)
          ? raw
          : raw && Array.isArray(raw.data)
            ? Buffer.from(raw.data)
            : Buffer.from(raw);
        return res.send(buf);
      } else {
        return res.status(404).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: result?.message || 'Banner no encontrado',
          success: false
        });
      }
    } catch (error) {
      this.logger.error(`Error getting banner image: ${error?.message || String(error)}`);
      return res.status(500).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener la imagen del banner',
        error: error?.message || String(error)
      });
    }
  }

  @Post('banner/list')
  @ApiOperation({ summary: 'Obtener todos los banners' })
  @ApiResponse({ status: 200, description: 'Lista de banners' })
  async getAllBanners(@Body() body: { fields?: string[] }) {
    const { fields } = body;
    try {
      const pattern = { cmd: 'get_all_banners' };
      const result = await this.imageClient.send(pattern, { fields }).toPromise();
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting all banners: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener los banners',
        error: error.message
      };
    }
  }

  @Get('banner/:id')
  @ApiOperation({ summary: 'Obtener banner por ID' })
  @ApiResponse({ status: 200, description: 'Banner encontrado' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  async getBannerById(@Param('id') id: string) {
    try {
      const pattern = { cmd: 'get_banner_by_id' };
      const payload = { id };
      const result = await this.imageClient.send(pattern, payload).toPromise();
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting banner by ID: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener el banner',
        error: error.message
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('banner/:id/update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes .webp'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, 
      },
    })
  )

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar banner existente' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Banner actualizado' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  async updateBanner(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() updateData: any
  ) {
    try {
      const pattern = { cmd: 'update_banner' };
      const payload = { id, updateData, file };

      const result = await this.imageClient.send(pattern, payload).toPromise();
      return result;
    } catch (error) {
      this.logger.error(`Error updating banner: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al actualizar el banner',
        error: error.message
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('banner/:id/delete')
  @ApiOperation({ summary: 'Eliminar banner' })
  @ApiResponse({ status: 200, description: 'Banner eliminado' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  async deleteBanner(@Param('id') id: string) {
    try {
      const pattern = { cmd: 'delete_banner' };
      const payload = { id };
      const result = await this.imageClient.send(pattern, payload).toPromise();
      return result;
    } catch (error) {
      this.logger.error(`Error deleting banner: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al eliminar el banner',
        error: error.message
      };
    }
  }

  @Post('banner/:id/toggle')
  @ApiOperation({ summary: 'Activar/Desactivar banner' })
  @ApiResponse({ status: 200, description: 'Estado del banner actualizado' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  async toggleBannerStatus(@Param('id') id: string) {
    try {
      const pattern = { cmd: 'toggle_banner_status' };
      const payload = { id };

      const result = await this.imageClient.send(pattern, payload);
      
      return result;
    } catch (error) {
      this.logger.error(`Error toggling banner status: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al cambiar el estado del banner',
        error: error.message
      };
    }
  }

  @Post('cart-screenshot/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes .png, .jpeg o .webp'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Subir captura silenciosa de la pantalla de éxito del checkout' })
  @ApiConsumes('multipart/form-data')
  async uploadCartScreenshot(
    @UploadedFile() file: any,
    @Body() body: { cartCodigo: string },
  ) {
    try {
      if (!file) {
        return { success: false, message: 'Falta el archivo' };
      }
      if (!body?.cartCodigo) {
        try { fs.unlinkSync(file.path); } catch {}
        return { success: false, message: 'Falta cartCodigo' };
      }

      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
      const endpoint = process.env.IMAGE_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT;
      const bucket = process.env.IMAGE_S3_BUCKET || 'ecommerce-images';
      const keyPrefix = (process.env.IMAGE_S3_CART_SCREENSHOT_KEY_PREFIX || 'cart-screenshots').replace(/^\/+|\/+$/g, '');

      if (!endpoint) {
        throw new Error('IMAGE_S3_ENDPOINT no está configurado (necesario para LocalStack)');
      }

      const s3 = new S3Client({
        region,
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
        },
      });

      const key = `${keyPrefix}/${encodeURIComponent(body.cartCodigo)}/${uuidv4()}${extname(file.originalname)}`;
      const buffer = fs.readFileSync(file.path);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype || 'image/png',
          CacheControl: 'private, max-age=0, no-cache',
        }),
      );

      const pattern = { cmd: 'upload_cart_screenshot' };
      const result = await firstValueFrom(
        this.imageClient.send(pattern, { key, cartCodigo: body.cartCodigo }),
      );

      try { fs.unlinkSync(file.path); } catch {}
      return result;
    } catch (error) {
      this.logger.error(`Error uploading cart screenshot: ${error.message}`);
      try { if (file?.path) fs.unlinkSync(file.path); } catch {}
      return {
        success: false,
        message: 'Error al subir la captura',
        error: error.message,
      };
    }
  }

  @Get('cart-screenshot/:codigo')
  @ApiOperation({ summary: 'Obtener la captura de la pantalla de éxito asociada a un carrito' })
  async getCartScreenshot(@Param('codigo') codigo: string) {
    try {
      const pattern = { cmd: 'get_cart_screenshot' };
      return await firstValueFrom(this.imageClient.send(pattern, { cartCodigo: codigo }));
    } catch (error) {
      this.logger.error(`Error getting cart screenshot: ${error.message}`);
      return {
        success: false,
        message: 'Error al obtener la captura',
        error: error.message,
      };
    }
  }

  @Get('banner/dimensions')
  @ApiOperation({ summary: 'Obtener dimensiones disponibles' })
  @ApiResponse({ status: 200, description: 'Dimensiones disponibles' })
  async getBannerDimensions() {
    try {
      const pattern = { cmd: 'get_banner_dimensions' };
      const result = await this.imageClient.send(pattern, {});
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting banner dimensions: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener las dimensiones',
        error: error.message
      };
    }
  }
}
