import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PromotionsService } from '../service/promotions.service';

@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  private normalizeDates(dto: any) {
    if (!dto || typeof dto !== 'object') return dto;
    return {
      ...dto,
      fechaInicio:
        dto.fechaInicio ?? dto.fechainicio ?? dto.fecha_inicio ?? dto.startDate,
      fechaFin: dto.fechaFin ?? dto.fechafin ?? dto.fecha_fin ?? dto.endDate,
    };
  }

  @MessagePattern({ cmd: 'crearPromocion' })
  async createPromotion(@Payload() payload: any) {
    const dtoRaw = payload?.createPromotionDto || payload;
    const dto = this.normalizeDates(dtoRaw);
    return await this.promotionsService.createPromotion(dto);
  }

  @MessagePattern({ cmd: 'actualizarPromocion' })
  async updatePromotion(@Payload() payload: any) {
    const { id, updatePromotionDto, ...rest } = payload || {};
    const dtoRaw = updatePromotionDto || rest;
    const dto = this.normalizeDates(dtoRaw);
    const { userId, ...cleanDto } = dto || {};
    const promoId = this.promotionsService.parsePromoId(id);
    return await this.promotionsService.updatePromotion(promoId, cleanDto);
  }

  @MessagePattern({ cmd: 'listarPromociones' })
  async listPromotions(@Payload() payload: any) {
    const { page, limit, filters } = payload || {};
    return await this.promotionsService.findAll(page, limit, filters);
  }

  @MessagePattern({ cmd: 'obtenerPromocion' })
  async getPromotion(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.id);
    return await this.promotionsService.findById(promoId);
  }

  @MessagePattern({ cmd: 'promocionesActivas' })
  async getActivePromotions() {
    return await this.promotionsService.findActivePromotions();
  }

  @MessagePattern({ cmd: 'agregarProductoAPromocionActiva' })
  async addProductToActivePromotion(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const { producto_codigo } = payload;
    return await this.promotionsService.addProductToActivePromotion(
      promoId,
      producto_codigo,
    );
  }

  @MessagePattern({ cmd: 'removerProductoDePromocion' })
  async removeProductFromPromotion(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const { producto_codigo } = payload;
    return await this.promotionsService.removeProductFromPromotion(
      promoId,
      producto_codigo,
    );
  }

  @MessagePattern({ cmd: 'upsertBannerPromocion' })
  async upsertPromotionBanner(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    if (Array.isArray(payload?.banners)) {
      return await this.promotionsService.appendBanners(promoId, payload.banners);
    }
    const { key, url } = payload;
    return await this.promotionsService.upsertBanner(promoId, key, url);
  }

  @MessagePattern({ cmd: 'asignarEventoAPromocion' })
  async assignEventToPromotion(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const eventId =
      payload?.eventId === undefined || payload?.eventId === null
        ? undefined
        : Number(payload.eventId);
    return await this.promotionsService.assignEventToPromotion(promoId, eventId);
  }

  @MessagePattern({ cmd: 'registrarVisitaPromocion' })
  async registerPromoVisit(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const { userId } = payload;
    return await this.promotionsService.registerPromoVisit(promoId, userId);
  }

  @MessagePattern({ cmd: 'registrarVistaProductoPromocion' })
  async registerPromoProductView(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const { producto_codigo } = payload;
    return await this.promotionsService.registerPromoProductView(
      promoId,
      producto_codigo,
    );
  }

  @MessagePattern({ cmd: 'registrarVentaProductoPromocion' })
  async registerPromoProductSale(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    const { producto_codigo, qty } = payload;
    return await this.promotionsService.registerPromoProductSale(
      promoId,
      producto_codigo,
      qty,
    );
  }

  @MessagePattern({ cmd: 'productoMasVistoEnPromocion' })
  async mostViewedProduct(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    return await this.promotionsService.getMostViewedProduct(promoId);
  }

  @MessagePattern({ cmd: 'productoMasVendidoEnPromocion' })
  async mostSoldProduct(@Payload() payload: any) {
    const promoId = this.promotionsService.parsePromoId(payload?.promoId);
    return await this.promotionsService.getMostSoldProduct(promoId);
  }

  @MessagePattern({ cmd: 'ultimasPromocionesVisitadasPorUsuario' })
  async lastVisitedPromos(@Payload() payload: any) {
    const { userId, limit } = payload;
    return await this.promotionsService.getLastVisitedPromosByUser(
      userId,
      limit,
    );
  }
}
