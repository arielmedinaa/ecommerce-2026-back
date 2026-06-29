import { Body, Controller, Post, Inject, Get, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Param, Delete, Patch, BadRequestException, Res, Query } from '@nestjs/common';
import { ClientProxy, Payload } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { Response } from 'express';

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

export const ImageFileInterceptor = () => 
  UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.webp')) {
          return callback(new BadRequestException('Solo se permiten archivos .webp'), false);
        }
        
        if (file.mimetype !== 'image/webp') {
          return callback(new BadRequestException('El archivo debe ser de tipo image/webp'), false);
        }
        
        callback(null, true);
      },
      limits: {
        fileSize: 1 * 1024 * 1024,
      }
    })
  );

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/create')
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'createProducts' }, createProductDto)
    )
  }

  @UseGuards(JwtAuthGuard)
  @Post('/combos')
  async createCombos(@Body() createComboDto: CreateComboDto) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'createCombo' }, createComboDto)
    )
  }

  @Post()
  async getProducts(
    @Body() filters: { limit: 4; offset: 0; categorias?: string },
  ) {
    try {
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products' }, filters).pipe(
          timeout(40000),
          catchError((error) => {
            console.error('Error in productsClient.send:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
              code: error.code,
            });
            throw error;
          }),
        ),
      );
      return products;
    } catch (error) {
      console.error('Error in getProducts:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error('Error al obtener los productos: ' + error.message);
    }
  }

  // Catálogo completo (~41k, proc v2) para el panel "Analizar Artículos" del admin.
  // Paginado + buscable server-side (limit/offset/search/categoria/marca/proveedor/precio).
  @Post('/v2')
  async getCatalogoV2(@Body() filters: any = {}) {
    try {
      return await firstValueFrom(
        this.productsClient.send({ cmd: 'get_catalogo_v2' }, filters).pipe(
          timeout(40000),
          catchError((error) => {
            console.error('Error in get_catalogo_v2:', error?.message);
            throw error;
          }),
        ),
      );
    } catch (error) {
      throw new Error('Error al obtener el catálogo completo: ' + error.message);
    }
  }

  // Sugerencias de búsqueda (autocomplete + términos de refinamiento) para el storefront.
  @Get('/suggestions')
  async getProductSuggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    try {
      return await firstValueFrom(
        this.productsClient
          .send({ cmd: 'get_product_suggestions' }, { q, limit: limit ? Number(limit) : undefined })
          .pipe(timeout(40000)),
      );
    } catch (error) {
      throw new Error('Error al obtener sugerencias: ' + error.message);
    }
  }

  @Get('/facets')
  async getProductsFacets() {
    try {
      return await firstValueFrom(
        this.productsClient
          .send({ cmd: 'get_products_facets' }, {})
          .pipe(timeout(40000)),
      );
    } catch (error) {
      throw new Error('Error al obtener las facetas: ' + error.message);
    }
  }

  @Get('/stats')
  async getProductsStats() {
    try {
      return await firstValueFrom(
        this.productsClient
          .send({ cmd: 'get_products_stats' }, {})
          .pipe(timeout(40000)),
      );
    } catch (error) {
      throw new Error('Error al obtener las stats: ' + error.message);
    }
  }

  @Post('/getProductsPrefetch')
  async getProductsPrefetch(@Body() body: {
    codigo: number
  }) {
    try {
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products_prefetch' }, body).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in productsClient.send:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
              code: error.code,
            });
            throw error;
          }),
        ),
      );
      return products;
    } catch (error) {
      console.error('Error in getProductsPrefetch:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error('Error al obtener los productos: ' + error.message);
    }
  }

  @Post('/getJota')
  async getJotaProducts(@Body() filters: { limit: 4; offset: 0; categorias?: string }){
    try {
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products_jota' }, filters).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in productsClient.send:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
              code: error.code,
            });
            throw error;
          }),
        ),
      );
      return products;
    } catch (error) {
      console.error('Error in getJotaProducts:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error('Error al obtener los productos: ' + error.message);
    }
  }

  @Post('/listar/promos')
  async getProductosByPromos(
    @Body() filters: { limit: 10; offset: 0; promoDesc?: string },
  ) {
    try {
      const productosPromos = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products_by_promos' }, filters),
      );
      return productosPromos;
    } catch (error) {
      console.error('Error in getProductosByPromos:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error(
        'Error al obtener los productos con promos: ' + error.message,
      );
    }
  }

  @Get('/searchComboByCodigo')
  async searchComboByCodigo(@Payload() payload: {
    codigo: string;
  }) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'search_combo_by_codigo' }, payload)
    )
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('/createOferta')
  async createOferta(@Body() ofertaData: any) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'create_oferta' }, ofertaData)
    )
  }

  @Post('/getOfertas')
  async getOfertas(@Body() filters: { limit: 10; offset: 0 }) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'get_ofertas' }, filters)
    )
  }

  @Get('/oferta/:id')
  async getOfertaById(@Param('id') id: string) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'get_oferta_by_id' }, { id: Number(id) })
    )
  }

  @Post('/by-codigos')
  async getProductsByCodigos(
    @Body() body: { codigos: string[]; limit?: number },
  ) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'get_products_by_codigos' }, body),
    );
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('/createPromo')
  async createPromo(@Body() promoData: any) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'create_promo' }, promoData)
    )
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:productoCodigo/images')
  @ImageFileInterceptor()
  async uploadProductImage(
    @Param('productoCodigo') productoCodigo: string,
    @UploadedFiles() files: MulterFile[],
    @Body() body: { orden?: number; principal?: boolean }
  ) {
    try {
      const payload = {
        productoCodigo,
        files,
        orden: body.orden || 0,
        principal: body.principal || false,
        userId: 'current_user'
      };

      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'upload_product_image' }, payload).pipe(
          timeout(15000),
          catchError((error) => {
            console.error('Error in upload_product_image:', error);
            throw error;
          })
        )
      );

      return result;
    } catch (error) {
      console.error('Error en uploadProductImage:', error);
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw new BadRequestException('El archivo excede el tamaño máximo de 1MB');
      }
      
      if (error.message.includes('Solo se permiten archivos .webp')) {
        throw new BadRequestException('Solo se permiten archivos .webp');
      }
      
      if (error.message.includes('El archivo debe ser de tipo image/webp')) {
        throw new BadRequestException('El archivo debe ser de tipo image/webp');
      }
      
      throw new Error('Error al subir la imagen: ' + error.message);
    }
  }

  @Get('/:productoCodigo/images')
  async getProductImages(@Param('productoCodigo') productoCodigo: string) {
    try {
      const images = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_product_images' }, productoCodigo).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in get_product_images:', error);
            throw error;
          })
        )
      );

      return images;
    } catch (error) {
      console.error('Error en getProductImages:', error);
      throw new Error('Error al obtener las imágenes: ' + error.message);
    }
  }

  @Get('/:productoCodigo/images/main')
  async getMainProductImage(@Param('productoCodigo') productoCodigo: string) {
    try {
      const image = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_main_product_image' }, productoCodigo).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in get_main_product_image:', error);
            throw error;
          })
        )
      );

      return image;
    } catch (error) {
      console.error('Error en getMainProductImage:', error);
      throw new Error('Error al obtener la imagen principal: ' + error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/images/:imageId')
  async updateProductImage(
    @Param('imageId') imageId: number,
    @Body() updates: any
  ) {
    try {
      const payload = {
        id: imageId,
        updates,
        userId: 'current_user'
      };

      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'update_product_image' }, payload).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in update_product_image:', error);
            throw error;
          })
        )
      );

      return result;
    } catch (error) {
      console.error('Error en updateProductImage:', error);
      throw new Error('Error al actualizar la imagen: ' + error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/images/:imageId')
  async deleteProductImage(@Param('imageId') imageId: number) {
    try {
      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'delete_product_image' }, imageId).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in delete_product_image:', error);
            throw error;
          })
        )
      );

      return result;
    } catch (error) {
      console.error('Error en deleteProductImage:', error);
      throw new Error('Error al eliminar la imagen: ' + error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:productoCodigo/images')
  async deleteAllProductImages(@Param('productoCodigo') productoCodigo: string) {
    try {
      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'delete_all_product_images' }, productoCodigo).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in delete_all_product_images:', error);
            throw error;
          })
        )
      );

      return result;
    } catch (error) {
      console.error('Error en deleteAllProductImages:', error);
      throw new Error('Error al eliminar todas las imágenes: ' + error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:productoCodigo/images/reorder')
  async reorderProductImages(
    @Param('productoCodigo') productoCodigo: string,
    @Body() body: { imageOrders: { id: number; orden: number }[] }
  ) {
    try {
      const payload = {
        productoCodigo,
        imageOrders: body.imageOrders
      };

      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'reorder_product_images' }, payload).pipe(
          timeout(10000),
          catchError((error) => {
            console.error('Error in reorder_product_images:', error);
            throw error;
          })
        )
      );

      return result;
    } catch (error) {
      console.error('Error en reorderProductImages:', error);
      throw new Error('Error al reordenar las imágenes: ' + error.message);
    }
  }

  @Get('/images/:filename')
  async getImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      if (!filename.toLowerCase().endsWith('.webp')) {
        return res.status(404).json({ message: 'Solo se permiten archivos .webp' });
      }

      const result = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_product_image_file' }, { filename }).pipe(
          timeout(15000),
        ),
      );

      if (result && result.success && result.data && result.data.buffer) {
        const raw = result.data.buffer as any;
        const buf = Buffer.isBuffer(raw)
          ? raw
          : raw && Array.isArray(raw.data)
            ? Buffer.from(raw.data)
            : Buffer.from(raw);
        res.setHeader('Content-Type', result.data.contentType || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(buf);
      }

      return res.status(404).json({ message: result?.message || 'Imagen no encontrada' });
    } catch (error) {
      console.error('Error en getImage:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error interno del servidor' });
      }
    }
  }
}
