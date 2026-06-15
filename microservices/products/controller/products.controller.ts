import { Body, Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { ProductsService } from '@products/service/products.service';
import { ProductsImagesService } from '@products/service/products-images.service';
import { Product } from '@products/schemas/product.schema';
// import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
// import { Combos } from '@products/schemas/combos.schema';
import { OfertasService } from '@products/service/ofertas.service';
import { PromosService } from '@products/service/promos.service';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(
    private readonly productsService: ProductsService, 
    private readonly ofertasService: OfertasService, 
    private readonly promosService: PromosService,
    private readonly productsImagesService: ProductsImagesService
  ) {}

  @MessagePattern({ cmd: 'createProducts' })
  public createProduct (createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  // @MessagePattern({ cmd: 'createCombo' })
  // public createCombo (createComboDto: CreateComboDto): Promise<Combos> {
  //   return this.productsService.createCombo(createComboDto);
  // }

  @MessagePattern({ cmd: 'get_products' })
  async findAll(@Body() filters: { offset: number; limit: number }) {
    try {
      return await this.productsService.findAll(filters);
    } catch (error) {
      this.logger.error('Error in get_products:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_products_facets' })
  async getProductsFacets() {
    try {
      const data = await this.productsService.getFacets();
      return { data, success: true, message: 'FACETAS DE PRODUCTOS' };
    } catch (error) {
      this.logger.error('Error in get_products_facets:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_products_stats' })
  async getProductsStats() {
    try {
      const data = await this.productsService.getStats();
      return { data, success: true, message: 'STATS DE PRODUCTOS' };
    } catch (error) {
      this.logger.error('Error in get_products_stats:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_products_prefetch' })
  async prefetchFindAll(@Payload() filters: any = {}) {
    return await this.productsService.prefetchfindAll(filters);
  }

  // @MessagePattern({ cmd: 'get_products_by_promos' })
  // async findByPromos(filters: any = {}) {
  //   try {
  //     return await this.productsService.findByPromos(filters);
  //   } catch (error) {
  //     this.logger.error('Error in findByPromos:', error);
  //     throw error;
  //   }
  // }

  // @MessagePattern({ cmd: 'search_combo_by_codigo' })
  // async searchComboByCodigo(codigo: string) {
  //   return await this.productsService.findComboByCodigo(codigo);
  // }

  @MessagePattern({ cmd: 'get_products_jota' })
  async getProductsJota(@Body() filters: { offset: number; limit: number }) {
    return await this.productsService.getProductsJota(filters);
  }

  @MessagePattern({ cmd: 'get_products_by_codigos' })
  async getProductsByCodigos(
    @Payload() payload: { codigos: string[]; limit?: number },
  ) {
    try {
      return await this.productsService.getProductsByCodigos(
        payload?.codigos || [],
        payload?.limit ?? 24,
      );
    } catch (error) {
      this.logger.error('Error in get_products_by_codigos:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_oferta' })
  async createOferta(ofertaData: any) {
    // Si viene id/codigo, es UPDATE (agregar/quitar productos de una oferta existente).
    const codigo = ofertaData?.id ?? ofertaData?.codigo;
    return await this.ofertasService.createOrUpdateOferta(
      ofertaData,
      codigo ? Number(codigo) : undefined,
    );
  }
  
  @MessagePattern({ cmd: 'get_ofertas' })
  async getOfertas(@Payload() filters: { limit: number; offset: number }) {
    return await this.ofertasService.getAllOfertas(filters);
  }

  @MessagePattern({ cmd: 'get_oferta_by_id' })
  async getOfertaById(@Payload() payload: { id: number }) {
    return await this.ofertasService.getOfertaById(Number(payload?.id));
  }
  
  @MessagePattern({ cmd: 'create_promo' })
  async createPromo(promoData: any) {
    return this.promosService.createPromo(promoData);
  }

  // Message Patterns para imágenes de productos
  @MessagePattern({ cmd: 'upload_product_image' })
  async uploadProductImage(@Payload() payload: { 
    productoCodigo: string; 
    files?: any; 
    orden?: number; 
    principal?: boolean; 
    userId?: string 
  }) {
    try {
      return await this.productsImagesService.uploadProductImage(
        payload.productoCodigo,
        payload.files,
        payload.orden,
        payload.principal,
        payload.userId
      );
    } catch (error) {
      this.logger.error('Error in upload_product_image:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_product_images' })
  async getProductImages(@Payload() productoCodigo: string) {
    try {
      return await this.productsImagesService.getImagesByProduct(productoCodigo);
    } catch (error) {
      this.logger.error('Error in get_product_images:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_product_image_file' })
  async getProductImageFile(@Payload() data: { filename: string }) {
    try {
      const { buffer, contentType } = await this.productsImagesService.getProductImageFile(
        data.filename,
      );
      return {
        data: { buffer, contentType },
        message: 'Archivo de imagen de producto obtenido exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        message: error?.message || 'Error obteniendo imagen de producto',
        success: false,
      };
    }
  }

  @MessagePattern({ cmd: 'update_product_image' })
  async updateProductImage(@Payload() payload: { 
    id: number; 
    updates: any; 
    userId?: string 
  }) {
    try {
      return await this.productsImagesService.updateImage(
        payload.id,
        payload.updates,
        payload.userId
      );
    } catch (error) {
      this.logger.error('Error in update_product_image:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_product_image' })
  async deleteProductImage(@Payload() id: number) {
    try {
      await this.productsImagesService.deleteImage(id);
      return { message: 'Imagen eliminada exitosamente' };
    } catch (error) {
      this.logger.error('Error in delete_product_image:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_all_product_images' })
  async deleteAllProductImages(@Payload() productoCodigo: string) {
    try {
      await this.productsImagesService.deleteAllProductImages(productoCodigo);
      return { message: 'Todas las imágenes eliminadas exitosamente' };
    } catch (error) {
      this.logger.error('Error in delete_all_product_images:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'reorder_product_images' })
  async reorderProductImages(@Payload() payload: { 
    productoCodigo: string; 
    imageOrders: { id: number; orden: number }[] 
  }) {
    try {
      await this.productsImagesService.reorderImages(
        payload.productoCodigo,
        payload.imageOrders
      );
      return { message: 'Imágenes reordenadas exitosamente' };
    } catch (error) {
      this.logger.error('Error in reorder_product_images:', error);
      throw error;
    }
  }
}
