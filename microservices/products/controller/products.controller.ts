import { Body, Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { ProductsService } from '@products/service/products.service';
import { ProductsImagesService } from '@products/service/products-images.service';
import { Product } from '@products/schemas/product.schema';

import { OfertasService } from '@products/service/ofertas.service';
import { PromosService } from '@products/service/promos.service';
import { CombosService } from '@products/service/combos.service';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(
    private readonly productsService: ProductsService,
    private readonly ofertasService: OfertasService,
    private readonly promosService: PromosService,
    private readonly productsImagesService: ProductsImagesService,
    private readonly combosService: CombosService,
  ) {}

  @MessagePattern({ cmd: 'createProducts' })
  public createProduct (createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @MessagePattern({ cmd: 'get_products' })
  async findAll(@Body() filters: { offset: number; limit: number }) {
    try {
      return await this.productsService.findAll(filters);
    } catch (error) {
      this.logger.error('Error in get_products:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_catalogo_v2' })
  async getCatalogoV2(@Body() filters: any = {}) {
    try {
      return await this.productsService.getCatalogoV2(filters);
    } catch (error) {
      this.logger.error('Error in get_catalogo_v2:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_product_suggestions' })
  async getProductSuggestions(@Body() payload: { q: string; limit?: number }) {
    try {
      return await this.productsService.getSuggestions(payload?.q, payload?.limit);
    } catch (error) {
      this.logger.error('Error in get_product_suggestions:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_complementos_producto' })
  async getComplementosProducto(@Body() payload: { codigo: string }) {
    try {
      return await this.productsService.getComplementosProducto(payload?.codigo);
    } catch (error) {
      this.logger.error('Error in get_complementos_producto:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'log_search' })
  async logSearch(@Body() payload: { termino: string; resultados?: number }) {
    return await this.productsService.logSearch(payload?.termino, payload?.resultados);
  }

  @MessagePattern({ cmd: 'get_mas_buscado' })
  async getMasBuscado(@Body() payload: { limit?: number }) {
    return await this.productsService.getMasBuscado(payload?.limit);
  }

  @MessagePattern({ cmd: 'get_horarios_agendamiento' })
  async getHorariosAgendamiento() {
    try {
      return await this.productsService.getHorariosAgendamiento();
    } catch (error) {
      this.logger.error('Error in get_horarios_agendamiento:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_products_stock' })
  async getProductsStock(@Body() payload: { codigos: string[] }) {
    try {
      return await this.productsService.getStockByCodigos(payload?.codigos || []);
    } catch (error) {
      this.logger.error('Error in get_products_stock:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_agendamiento_slots' })
  async getAgendamientoSlots(@Body() payload: { codigos: string[]; ciudadId?: number; retirar?: boolean }) {
    try {
      return await this.productsService.getAgendamientoSlots(payload || { codigos: [] });
    } catch (error) {
      this.logger.error('Error in get_agendamiento_slots:', error);
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

  @MessagePattern({ cmd: 'get_promo_info_for_codigos' })
  async getPromoInfoForCodigos(@Payload() payload: { codigos: string[] }) {
    try {
      return await this.productsService.getPromoInfoForCodigos(payload?.codigos || []);
    } catch (error) {
      this.logger.error('Error in get_promo_info_for_codigos:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'list_econt_promotions' })
  async listEcontPromotions() {
    try {
      const data = await this.productsService.listEcontPromotions();
      return { data, success: true, message: 'Promociones activas de ECONT' };
    } catch (error) {
      this.logger.error('Error in list_econt_promotions:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_econt_promotion_products' })
  async getEcontPromotionProducts(@Payload() payload: { idPromo: number }) {
    try {
      return await this.productsService.getEcontPromotionProducts(Number(payload?.idPromo));
    } catch (error) {
      this.logger.error('Error in get_econt_promotion_products:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_product_sello' })
  async updateProductSello(@Payload() payload: {
    productoCodigo: string;
    file: any;
    userId?: string;
    fechaDesde?: string | null;
    fechaHasta?: string | null;
  }) {
    try {
      return await this.productsService.updateProductSello(
        payload.productoCodigo,
        payload.file,
        payload.userId,
        payload.fechaDesde,
        payload.fechaHasta,
      );
    } catch (error) {
      this.logger.error('Error in update_product_sello:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_product_sello' })
  async deleteProductSello(@Payload() productoCodigo: string) {
    try {
      return await this.productsService.deleteProductSello(productoCodigo);
    } catch (error) {
      this.logger.error('Error in delete_product_sello:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_cms_combo' })
  async createCmsCombo(@Payload() dto: any) {
    return await this.combosService.createCmsCombo(dto);
  }

  @MessagePattern({ cmd: 'update_cms_combo' })
  async updateCmsCombo(@Payload() payload: { id: number; dto: any }) {
    return await this.combosService.updateCmsCombo(Number(payload?.id), payload?.dto);
  }

  @MessagePattern({ cmd: 'get_cms_combos' })
  async getCmsCombos(@Payload() filters: { limit: number; offset: number; activo?: boolean }) {
    return await this.combosService.getCmsCombos(filters);
  }

  @MessagePattern({ cmd: 'get_cms_combo_by_id' })
  async getCmsComboById(@Payload() payload: { id: number }) {
    return await this.combosService.getCmsComboById(Number(payload?.id));
  }

  @MessagePattern({ cmd: 'delete_cms_combo' })
  async deleteCmsCombo(@Payload() payload: { id: number }) {
    return await this.combosService.deleteCmsCombo(Number(payload?.id));
  }

  @MessagePattern({ cmd: 'toggle_cms_combo_status' })
  async toggleCmsComboStatus(@Payload() payload: { id: number }) {
    return await this.combosService.toggleCmsComboStatus(Number(payload?.id));
  }

  @MessagePattern({ cmd: 'upload_combo_image' })
  async uploadComboImage(@Payload() payload: { id: number; file: any }) {
    try {
      return await this.combosService.uploadComboImage(Number(payload?.id), payload?.file);
    } catch (error) {
      this.logger.error('Error in upload_combo_image:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'list_econt_combo_promotions' })
  async listEcontCombosPromotions() {
    try {
      const data = await this.combosService.listEcontCombosPromotions();
      return { data, success: true, message: 'Promociones activas de ECONT con combos' };
    } catch (error) {
      this.logger.error('Error in list_econt_combo_promotions:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_econt_combos_for_promo' })
  async getEcontCombosForPromo(@Payload() payload: { idPromo: number }) {
    try {
      const data = await this.combosService.getEcontCombosForPromo(Number(payload?.idPromo));
      return { data, success: true, message: 'Combos de la promoción ECONT' };
    } catch (error) {
      this.logger.error('Error in get_econt_combos_for_promo:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'upload_econt_combo_image' })
  async uploadEcontComboImage(@Payload() payload: { idCombo: number; file: any }) {
    try {
      return await this.combosService.uploadEcontComboImage(Number(payload?.idCombo), payload?.file);
    } catch (error) {
      this.logger.error('Error in upload_econt_combo_image:', error);
      throw error;
    }
  }
}
