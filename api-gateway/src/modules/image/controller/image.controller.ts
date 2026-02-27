import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  UploadedFile, 
  UseInterceptors,
  Res,
  HttpStatus,
  Logger,
  Inject,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

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
          cb(new Error('Solo se permiten archivos de imagen (webp)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subir un nuevo banner' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Banner subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en la validación' })
  async uploadBanner(
    @UploadedFile() file: any,
    @Body() body: {
      nombre: string;
      variante: string;
      creadoPor: string;
      modificadoPor: string;
    }
  ) {
    try {
      this.logger.log(`Uploading banner: ${body.nombre}`);
      const pattern = { cmd: 'upload_banner' };
      const payload = {
        file,
        nombre: body.nombre,
        variante: body.variante,
        creadoPor: body.creadoPor,
        modificadoPor: body.modificadoPor
      };

      const result = await this.imageClient.send(pattern, payload);
      return result;
    } catch (error) {
      this.logger.error(`Error uploading banner: ${error.message}`);
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
      const pattern = { cmd: 'get_banner_image' };
      const payload = { nombre, device };
      const result = await this.imageClient.send(pattern, payload).toPromise();
      if (result && result.success && result.data && result.data.filePath) {
        const filePath = result.data.filePath;
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'La imagen solicitada no existe',
            success: false
          });
        }
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'image/webp'; // default
        
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            contentType = 'image/jpeg';
            break;
          case '.png':
            contentType = 'image/png';
            break;
          case '.gif':
            contentType = 'image/gif';
            break;
          case '.webp':
            contentType = 'image/webp';
            break;
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.sendFile(filePath);
      } else {
        return res.status(404).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: result?.message || 'Banner no encontrado',
          success: false
        });
      }
    } catch (error) {
      this.logger.error(`Error getting banner image: ${error.message}`);
      return res.status(500).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener la imagen del banner',
        error: error.message
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
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos de imagen (jpeg, png, webp, gif)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
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