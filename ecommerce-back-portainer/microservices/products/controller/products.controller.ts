import { Body, Controller, Logger } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { ProductsService } from '@products/service/products/products.service';
import { ProductsImagesService } from '@products/service/products/products-images.service';
import { Product } from '@products/schemas/products/product.schema';

import { OfertasService } from '@products/service/ofertas/ofertas.service';
import { PromosService } from '@products/service/promos/promos.service';
import { CombosService } from '@products/service/combos/combos.service';
import { ProductsSellersService } from '@products/service/products-seller/products-sellers.service';
import { SellerCatalogService } from '@products/service/products-seller/seller-catalog.service';
import { NotificationsService } from '@products/service/notifications/notifications.service';
import { PushNotificationService } from '@products/service/notifications/push-notification.service';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(
    private readonly productsService: ProductsService,
    private readonly ofertasService: OfertasService,
    private readonly promosService: PromosService,
    private readonly productsImagesService: ProductsImagesService,
    private readonly combosService: CombosService,
    private readonly productsSellersService: ProductsSellersService,
    private readonly sellerCatalogService: SellerCatalogService,
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @MessagePattern({ cmd: 'get_vapid_public_key' })
  getVapidPublicKey() {
    return { data: { publicKey: this.pushNotificationService.getVapidPublicKey() }, message: 'Ok', success: true };
  }

  @MessagePattern({ cmd: 'subscribe_push' })
  subscribePush(@Payload() data: { destinatarioTipo: 'admin' | 'provider'; idProveedor?: number | null; subscription: any }) {
    return this.pushNotificationService.saveSubscription(data.destinatarioTipo, data.idProveedor ?? null, data.subscription);
  }

  @MessagePattern({ cmd: 'unsubscribe_push' })
  unsubscribePush(@Payload() data: { endpoint: string }) {
    return this.pushNotificationService.removeSubscription(data.endpoint);
  }

  @MessagePattern({ cmd: 'initiate_import_products_sellers_excel' })
  async initiateImportProductsSellersExcel(@Payload() data: { buffer: any; idProveedor: number; creadoPor: string; nombreArchivo?: string }) {
    const buffer = Buffer.isBuffer(data.buffer) ? data.buffer : Buffer.from(data.buffer);
    const result = await this.productsSellersService.initiateImport(buffer, data.idProveedor, data.creadoPor, data.nombreArchivo);
    if (result.success && result.data) {
      this.productsSellersService.processImportJob(result.data.idHistorial).catch((err) => {
        this.logger.error(`Error en processImportJob: ${err?.message || err}`);
      });
    }
    return result;
  }

  @MessagePattern({ cmd: 'list_excel_historial' })
  listExcelHistorial(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.listHistorialExcel(data.idProveedor);
  }

  @MessagePattern({ cmd: 'get_excel_historial_detalle' })
  getExcelHistorialDetalle(@Payload() data: { idHistorial: number; idProveedor: number; page?: number; limit?: number; soloRechazados?: boolean }) {
    return this.productsSellersService.getHistorialDetalle(data.idHistorial, data.idProveedor, data.page, data.limit, data.soloRechazados);
  }

  @MessagePattern({ cmd: 'retry_excel_historial_detalle' })
  retryExcelHistorialDetalle(@Payload() data: { idDetalle: number; idProveedor: number; modificadoPor: string; correccion: Record<string, string> }) {
    return this.productsSellersService.retryHistorialDetalleRow(data.idDetalle, data.idProveedor, data.modificadoPor, data.correccion || {});
  }

  @MessagePattern({ cmd: 'get_excel_historial_status' })
  getExcelHistorialStatus(@Payload() data: { idHistorial: number; idProveedor: number }) {
    return this.productsSellersService.getExcelHistorialStatus(data.idHistorial, data.idProveedor);
  }

  @MessagePattern({ cmd: 'download_excel_historial' })
  downloadExcelHistorial(@Payload() data: { idHistorial: number; idProveedor: number }) {
    return this.productsSellersService.downloadHistorialExcel(data.idHistorial, data.idProveedor);
  }

  @MessagePattern({ cmd: 'validate_seller_image' })
  validateSellerImage(@Payload() data: { idProveedor: number; codigoArticulo: string; campo: string; url?: string; buffer?: any }) {
    const buffer = data.buffer ? (Buffer.isBuffer(data.buffer) ? data.buffer : Buffer.from(data.buffer)) : undefined;
    return this.productsSellersService.validateSellerImage(data.idProveedor, data.codigoArticulo, data.campo, { url: data.url, buffer });
  }

  @MessagePattern({ cmd: 'get_products_sellers_template' })
  async getProductsSellersTemplate() {
    const buffer = await this.productsSellersService.generateTemplate();
    return { data: buffer, message: 'Plantilla generada', success: true };
  }

  @MessagePattern({ cmd: 'list_products_sellers_pendientes' })
  listProductsSellersPendientes(@Payload() data: { idProveedor?: number; estado?: string }) {
    return this.productsSellersService.listPendientes(data?.idProveedor, data?.estado);
  }

  @MessagePattern({ cmd: 'list_products_sellers_by_proveedor' })
  listProductsSellersByProveedor(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.listByProveedor(data.idProveedor);
  }

  @MessagePattern({ cmd: 'approve_product_seller' })
  approveProductSeller(@Payload() data: {
    id: number;
    modificadoPor: string;
    correccion?: {
      codigo_marca?: string;
      codigo_categoria?: string;
      codigo_subcategoria?: string;
    };
  }) {
    return this.productsSellersService.approve(data.id, data.modificadoPor, data.correccion);
  }

  @MessagePattern({ cmd: 'reject_product_seller' })
  rejectProductSeller(@Payload() data: { id: number; codigoRechazo: number; notaAdicional?: string; modificadoPor: string }) {
    return this.productsSellersService.reject(data.id, data.codigoRechazo, data.notaAdicional, data.modificadoPor);
  }

  @MessagePattern({ cmd: 'get_rejection_codes' })
  getRejectionCodes() {
    return this.productsSellersService.getRejectionCodes();
  }

  @MessagePattern({ cmd: 'get_import_error_codes' })
  getImportErrorCodes() {
    return this.productsSellersService.getImportErrorCodes();
  }

  @MessagePattern({ cmd: 'resolve_proveedor_by_email' })
  async resolveProveedorByEmail(@Payload() data: { email: string }) {
    const idProveedor = await this.productsSellersService.resolveProveedorIdByEmail(data.email);
    return { data: { idProveedor }, message: 'Ok', success: true };
  }

  @MessagePattern({ cmd: 'get_seller_catalog' })
  async getSellerCatalog(@Payload() data: { search?: string; categoria?: string; marca?: string; limit?: number; offset?: number }) {
    return this.sellerCatalogService.listCatalog(data || {});
  }

  @MessagePattern({ cmd: 'get_seller_catalog_detail' })
  async getSellerCatalogDetail(@Payload() data: { codigo: string }) {
    return this.sellerCatalogService.getByCodigo(data.codigo);
  }

  @MessagePattern({ cmd: 'get_seller_catalog_facets' })
  async getSellerCatalogFacets() {
    return this.sellerCatalogService.getFacets();
  }

  @MessagePattern({ cmd: 'create_proveedor' })
  async createProveedor(@Payload() data: { nombre: string; email: string }) {
    return this.productsSellersService.createProveedor(data);
  }

  @MessagePattern({ cmd: 'list_proveedores' })
  async listProveedores() {
    return this.productsSellersService.listProveedores();
  }

  @MessagePattern({ cmd: 'get_provider_dashboard_stats' })
  getProviderDashboardStats(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.getDashboardStats(data.idProveedor);
  }

  @MessagePattern({ cmd: 'bulk_resubmit_products_sellers' })
  bulkResubmitProductsSellers(@Payload() data: { ids: number[]; correcciones: Record<number, any>; idProveedor: number }) {
    return this.productsSellersService.bulkResubmit(data.ids, data.correcciones || {}, data.idProveedor);
  }

  @MessagePattern({ cmd: 'get_proveedor_profile' })
  getProveedorProfile(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.getProveedorProfile(data.idProveedor);
  }

  @MessagePattern({ cmd: 'update_proveedor_profile' })
  updateProveedorProfile(@Payload() data: { idProveedor: number; payload: { nombre?: string; ruc?: string; telefono?: string; direccion?: string } }) {
    return this.productsSellersService.updateProveedorProfile(data.idProveedor, data.payload || {});
  }

  @MessagePattern({ cmd: 'verify_proveedor_password' })
  verifyProveedorPassword(@Payload() data: { email: string; password: string }) {
    return this.productsSellersService.verifyProveedorPassword(data.email, data.password);
  }

  @MessagePattern({ cmd: 'change_proveedor_password' })
  changeProveedorPassword(@Payload() data: { idProveedor: number; currentPassword: string; newPassword: string }) {
    return this.productsSellersService.changeProveedorPassword(data.idProveedor, data.currentPassword, data.newPassword);
  }

  @MessagePattern({ cmd: 'list_proveedor_documentos' })
  listProveedorDocumentos(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.listProveedorDocumentos(data.idProveedor);
  }

  @MessagePattern({ cmd: 'upload_proveedor_documento' })
  uploadProveedorDocumento(@Payload() data: { idProveedor: number; file: { originalname: string; mimetype: string; buffer: any } }) {
    const buffer = Buffer.isBuffer(data.file.buffer) ? data.file.buffer : Buffer.from(data.file.buffer);
    return this.productsSellersService.uploadProveedorDocumento(data.idProveedor, { ...data.file, buffer });
  }

  @MessagePattern({ cmd: 'delete_proveedor_documento' })
  deleteProveedorDocumento(@Payload() data: { idProveedor: number; idDocumento: number }) {
    return this.productsSellersService.deleteProveedorDocumento(data.idProveedor, data.idDocumento);
  }

  @MessagePattern({ cmd: 'generate_proveedor_api_token' })
  generateProveedorApiToken(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.generateProveedorApiToken(data.idProveedor);
  }

  @MessagePattern({ cmd: 'revoke_proveedor_api_token' })
  revokeProveedorApiToken(@Payload() data: { idProveedor: number }) {
    return this.productsSellersService.revokeProveedorApiToken(data.idProveedor);
  }

  @MessagePattern({ cmd: 'etl_upsert_product_seller' })
  etlUpsertProductSeller(@Payload() data: { idProveedor: number; payload: any; creadoPor: string }) {
    return this.productsSellersService.upsertFromEtl(data.idProveedor, data.payload, data.creadoPor);
  }

  @MessagePattern({ cmd: 'get_notifications' })
  getNotifications(@Payload() data: { destinatarioTipo: 'admin' | 'provider'; idProveedor?: number }) {
    return this.notificationsService.list(data.destinatarioTipo, data.idProveedor).then((data) => ({ data, message: 'Ok', success: true }));
  }

  @MessagePattern({ cmd: 'mark_notification_read' })
  markNotificationRead(@Payload() data: { id: number }) {
    return this.notificationsService.markRead(data.id).then(() => ({ data: null, message: 'Ok', success: true }));
  }

  @MessagePattern({ cmd: 'mark_all_notifications_read' })
  markAllNotificationsRead(@Payload() data: { destinatarioTipo: 'admin' | 'provider'; idProveedor?: number }) {
    return this.notificationsService
      .markAllRead(data.destinatarioTipo, data.idProveedor)
      .then(() => ({ data: null, message: 'Ok', success: true }));
  }

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
  async listEcontPromotions(@Payload() payload: { desde?: string; hasta?: string }) {
    try {
      const data = await this.productsService.listEcontPromotions(payload);
      return { data, success: true, message: 'Promociones de ECONT' };
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

  @MessagePattern({ cmd: 'get_promocion_rendimiento' })
  async getPromocionRendimiento(
    @Payload() payload: { idPromo: number; desde: string; hasta: string },
  ) {
    return this.productsService.getRendimientoPromocion(
      Number(payload?.idPromo),
      payload?.desde,
      payload?.hasta,
    );
  }

  @MessagePattern({ cmd: 'buscar_documento_por_secuencia' })
  async buscarDocumentoPorSecuencia(@Payload() payload: { secuencia: number }) {
    return this.productsService.buscarDocumentoPorSecuencia(Number(payload?.secuencia));
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

  @MessagePattern({ cmd: 'search_econt_combos' })
  async searchEcontCombos(@Payload() payload: { term: string; limit?: number }) {
    try {
      const data = await this.combosService.searchEcontCombos(payload?.term ?? '', Number(payload?.limit) || 6);
      return { data, success: true, message: 'Combos encontrados' };
    } catch (error) {
      this.logger.error('Error in search_econt_combos:', error);
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

  @MessagePattern({ cmd: 'list_econt_combo_images' })
  async listEcontComboImages(@Payload() payload: { idCombo: number }) {
    try {
      return await this.combosService.listEcontComboImages(Number(payload?.idCombo));
    } catch (error) {
      this.logger.error('Error in list_econt_combo_images:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_econt_combo_image' })
  async deleteEcontComboImage(@Payload() payload: { idCombo: number; imagenId: number }) {
    try {
      return await this.combosService.deleteEcontComboImage(Number(payload?.idCombo), Number(payload?.imagenId));
    } catch (error) {
      this.logger.error('Error in delete_econt_combo_image:', error);
      throw error;
    }
  }
}
