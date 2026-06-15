import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  In,
} from 'typeorm';
import { Promotion } from '../schemas/promotion.schema';
import { PromotionProduct } from '../schemas/promotion-product.schema';
import { PromotionVisit } from '../schemas/promotion-visit.schema';
import { CreatePromotionDto } from '../schemas/dto/create-promotion.dto';
import { UpdatePromotionDto } from '../schemas/dto/update-promotion.dto';
import { Event } from '@content/events/schemas/event.schema';
import { PromotionBannerRef } from '../schemas/promotion.schema';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion, 'WRITE_CONNECTION')
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Promotion, 'READ_CONNECTION')
    private readonly promotionRepositoryRead: Repository<Promotion>,

    @InjectRepository(PromotionProduct, 'WRITE_CONNECTION')
    private readonly promotionProductRepository: Repository<PromotionProduct>,
    @InjectRepository(PromotionProduct, 'READ_CONNECTION')
    private readonly promotionProductRepositoryRead: Repository<PromotionProduct>,

    @InjectRepository(PromotionVisit, 'WRITE_CONNECTION')
    private readonly promotionVisitRepository: Repository<PromotionVisit>,
    @InjectRepository(PromotionVisit, 'READ_CONNECTION')
    private readonly promotionVisitRepositoryRead: Repository<PromotionVisit>,

    @InjectRepository(Event, 'WRITE_CONNECTION')
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Event, 'READ_CONNECTION')
    private readonly eventRepositoryRead: Repository<Event>,
  ) {}

  private parseId(value: any, field: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} inválido`);
    }
    return parsed;
  }

  private ensureDateRange(fechaInicio: string | Date, fechaFin: string | Date) {
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Rango de fechas inválido.');
    }
    if (start >= end) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    }
  }

  async createPromotion(dto: CreatePromotionDto) {
    try {
      this.ensureDateRange(dto.fechaInicio, dto.fechaFin);

      if (dto.eventId) {
        const event = await this.eventRepositoryRead.findOne({
          where: { id: dto.eventId },
        });
        if (!event) throw new BadRequestException('El evento no existe.');
      }

      const entity = this.promotionRepository.create({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        activo: dto.activo ?? true,
        landingId: dto.landingId,
        order: dto.order ?? 0,
        url: dto.url,
        eventId: dto.eventId,
        banners: (dto as any).banners,
      });

      const saved = await this.promotionRepository.save(entity);

      if (dto.eventId) {
        await this.eventRepository.update({ id: dto.eventId }, { idPromo: saved.id });
      }

      return { data: saved, message: 'PROMOCIÓN CREADA CON ÉXITO', success: true };
    } catch (error) {
      this.logger.error('Error al crear promoción', error);
      throw new BadRequestException(error.message || 'ERROR AL CREAR PROMOCIÓN.');
    }
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto) {
    const promotion = await this.promotionRepositoryRead.findOne({ where: { id } });
    if (!promotion) throw new NotFoundException(`Promoción con ID ${id} no encontrada`);

    if (dto.fechaInicio || dto.fechaFin) {
      this.ensureDateRange(dto.fechaInicio || promotion.fechaInicio, dto.fechaFin || promotion.fechaFin);
    }

    if (dto.eventId !== undefined) {
      if (dto.eventId) {
        const event = await this.eventRepositoryRead.findOne({ where: { id: dto.eventId } });
        if (!event) throw new BadRequestException('El evento no existe.');
      }
    }

    const next = this.promotionRepository.merge(promotion, {
      ...dto,
      fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : promotion.fechaInicio,
      fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : promotion.fechaFin,
    } as any);

    const saved = await this.promotionRepository.save(next);

    if (dto.eventId !== undefined) {
      if (dto.eventId) {
        await this.eventRepository.update({ id: dto.eventId }, { idPromo: saved.id });
        if (promotion.eventId && promotion.eventId !== dto.eventId) {
          await this.eventRepository.update({ id: promotion.eventId }, { idPromo: null });
        }
      } else if (promotion.eventId) {
        await this.eventRepository.update({ id: promotion.eventId }, { idPromo: null });
        await this.promotionRepository.update({ id: saved.id }, { eventId: null });
      }
    }

    return { data: saved, message: 'PROMOCIÓN ACTUALIZADA', success: true };
  }

  async findAll(page: number = 1, limit: number = 10, filters: any = {}) {
    const skip = Math.max(0, (page - 1) * limit);
    const qb = this.promotionRepositoryRead.createQueryBuilder('promo');

    if (filters.nombre) {
      qb.andWhere('promo.nombre LIKE :nombre', { nombre: `%${filters.nombre}%` });
    }
    if (filters.activo !== undefined) {
      qb.andWhere('promo.activo = :activo', { activo: filters.activo });
    }
    if (filters.eventId) {
      qb.andWhere('promo.eventId = :eventId', { eventId: filters.eventId });
    }

    const [promotions, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('promo.order', 'DESC')
      .addOrderBy('promo.createdAt', 'DESC')
      .getManyAndCount();

    return { promotions, total, pages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
    return promo;
  }

  async findActivePromotions() {
    const now = new Date();
    return await this.promotionRepositoryRead.find({
      where: {
        activo: true,
        fechaInicio: LessThanOrEqual(now),
        fechaFin: MoreThanOrEqual(now),
      },
      order: { order: 'DESC', createdAt: 'DESC' },
    });
  }

  async addProductToActivePromotion(promoId: number, producto_codigo: string) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    const now = new Date();
    const isActiveNow =
      promo.activo && promo.fechaInicio <= now && promo.fechaFin >= now;
    if (!isActiveNow) {
      throw new BadRequestException('La promoción no está activa.');
    }

    const existing = await this.promotionProductRepositoryRead.findOne({
      where: { promoId, producto_codigo },
    });
    if (existing) {
      return {
        data: existing,
        message: `El producto ${producto_codigo} ya está asignado a la promoción ${promoId}`,
        success: false,
      };
    }

    const relation = this.promotionProductRepository.create({
      promoId,
      producto_codigo,
      activo: true,
    });
    const saved = await this.promotionProductRepository.save(relation);
    return { data: saved, message: 'PRODUCTO AGREGADO A LA PROMOCIÓN', success: true };
  }

  async removeProductFromPromotion(promoId: number, producto_codigo: string) {
    const result = await this.promotionProductRepository.delete({
      promoId,
      producto_codigo,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Producto ${producto_codigo} no encontrado en promoción ${promoId}`,
      );
    }
    return { message: 'PRODUCTO REMOVIDO DE LA PROMOCIÓN', success: true };
  }

  async upsertBanner(promoId: number, key: 'desktop' | 'tablet' | 'mobile' | 'small', url: string) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    // Backwards compatible: if someone still uses key/url, store it as a lightweight banner entry
    const legacyBanner: PromotionBannerRef = {
      bannerId: `legacy:${key}:${Date.now()}`,
      nombre: `legacy-${promoId}-${key}`,
      variante: 'legacy',
      dimensiones: {
        [key]: {
          fileName: '',
          width: 0,
          height: 0,
          url,
        },
      } as any,
    };

    const nextBanners = [...(promo.banners || []), legacyBanner];
    await this.promotionRepository.update({ id: promoId }, { banners: nextBanners });
    return {
      data: { promoId, banners: nextBanners },
      message: 'BANNER AGREGADO',
      success: true,
    };
  }

  async appendBanners(promoId: number, banners: PromotionBannerRef[]) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    const next = [...(promo.banners || []), ...(banners || [])];
    await this.promotionRepository.update({ id: promoId }, { banners: next });
    return { data: { promoId, banners: next }, message: 'BANNERS AGREGADOS', success: true };
  }

  async assignEventToPromotion(promoId: number, eventId?: number | null) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    if (eventId) {
      const event = await this.eventRepositoryRead.findOne({ where: { id: eventId } });
      if (!event) throw new BadRequestException('El evento no existe.');
      await this.eventRepository.update({ id: eventId }, { idPromo: promoId });
    }

    if (promo.eventId && (!eventId || promo.eventId !== eventId)) {
      await this.eventRepository.update({ id: promo.eventId }, { idPromo: null });
    }

    await this.promotionRepository.update({ id: promoId }, { eventId: eventId || null });
    return { message: 'EVENTO ASIGNADO A LA PROMOCIÓN', success: true };
  }

  async registerPromoVisit(promoId: number, userId: string) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    const visit = this.promotionVisitRepository.create({ promoId, userId });
    await this.promotionVisitRepository.save(visit);
    return { message: 'VISITA REGISTRADA', success: true };
  }

  async registerPromoProductView(promoId: number, producto_codigo: string) {
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    const existing = await this.promotionProductRepositoryRead.findOne({
      where: { promoId, producto_codigo },
    });

    if (!existing) {
      const created = await this.promotionProductRepository.save(
        this.promotionProductRepository.create({
          promoId,
          producto_codigo,
          viewCount: 1,
          soldCount: 0,
          activo: true,
        }),
      );
      return { data: created, message: 'VISTA REGISTRADA', success: true };
    }

    await this.promotionProductRepository
      .createQueryBuilder()
      .update(PromotionProduct)
      .set({ viewCount: () => 'viewCount + 1' })
      .where('promoId = :promoId AND producto_codigo = :producto_codigo', { promoId, producto_codigo })
      .execute();

    return { message: 'VISTA REGISTRADA', success: true };
  }

  async registerPromoProductSale(promoId: number, producto_codigo: string, qty: number = 1) {
    if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('qty inválido');
    const promo = await this.promotionRepositoryRead.findOne({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    const existing = await this.promotionProductRepositoryRead.findOne({
      where: { promoId, producto_codigo },
    });

    if (!existing) {
      const created = await this.promotionProductRepository.save(
        this.promotionProductRepository.create({
          promoId,
          producto_codigo,
          viewCount: 0,
          soldCount: qty,
          activo: true,
        }),
      );
      return { data: created, message: 'VENTA REGISTRADA', success: true };
    }

    await this.promotionProductRepository
      .createQueryBuilder()
      .update(PromotionProduct)
      .set({ soldCount: () => `soldCount + ${qty}` })
      .where('promoId = :promoId AND producto_codigo = :producto_codigo', { promoId, producto_codigo })
      .execute();

    return { message: 'VENTA REGISTRADA', success: true };
  }

  async getMostViewedProduct(promoId: number) {
    const top = await this.promotionProductRepositoryRead.findOne({
      where: { promoId },
      order: { viewCount: 'DESC' },
    });
    return top || null;
  }

  async getMostSoldProduct(promoId: number) {
    const top = await this.promotionProductRepositoryRead.findOne({
      where: { promoId },
      order: { soldCount: 'DESC' },
    });
    return top || null;
  }

  // Devuelve los codigos de producto asociados a una promocion (para el carrusel
  // de landings). Orden estable por mas vendidos / mas vistos.
  async getPromotionProducts(promoId: number): Promise<{
    promoId: number;
    codigos: string[];
    total: number;
  }> {
    const rows = await this.promotionProductRepositoryRead.find({
      where: { promoId, activo: true },
      order: { soldCount: 'DESC', viewCount: 'DESC' },
    });
    const codigos = rows
      .map((r) => String(r.producto_codigo ?? '').trim())
      .filter(Boolean);
    return { promoId, codigos, total: codigos.length };
  }

  async getLastVisitedPromosByUser(userId: string, limit: number = 10) {
    const visits = await this.promotionVisitRepositoryRead.find({
      where: { userId },
      order: { visitedAt: 'DESC' },
      take: Math.max(1, Math.min(50, limit * 5)),
    });

    const uniquePromoIds: number[] = [];
    for (const v of visits) {
      if (!uniquePromoIds.includes(v.promoId)) uniquePromoIds.push(v.promoId);
      if (uniquePromoIds.length >= limit) break;
    }

    if (uniquePromoIds.length === 0) return [];

    const promos = await this.promotionRepositoryRead.find({
      where: { id: In(uniquePromoIds) },
    });
    const byId = new Map(promos.map((p) => [p.id, p]));
    return uniquePromoIds.map((id) => byId.get(id)).filter(Boolean);
  }

  // Helpers for controller payloads
  parsePromoId(promoId: any) {
    return this.parseId(promoId, 'promoId');
  }
}
