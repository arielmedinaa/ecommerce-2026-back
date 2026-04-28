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

  @MessagePattern({ cmd: 'create_oferta' })
  async createOferta(ofertaData: any) {
    return await this.ofertasService.createOrUpdateOferta(ofertaData);
  }
  
  @MessagePattern({ cmd: 'get_ofertas' })
  async getOfertas(@Payload() filters: { limit: number; offset: number }) {
    return await this.ofertasService.getAllOfertas(filters);
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
