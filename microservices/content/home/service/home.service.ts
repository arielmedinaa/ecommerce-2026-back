import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@shared/common/cache/redis.module';
import { firstValueFrom } from 'rxjs';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData, HomeCategoriaFamilia } from '@content/home/interfaces/home.interface';
import { HomeSectionResponse } from '@content/home/interfaces/home-sections.interface';
import { VerticalesService } from '@content/verticales/service/verticales.service';
import { ResponseData } from '@shared/common/response/response.data';
import { FamiliasConId, SubFamilias } from '@shared/common/utils/familias';
import {
  ResilientService,
  ResilientOptions,
} from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';
import { HomeSectionsService } from './home-sections.service';
import { HomeSection, HomeSectionType } from '../schemas/home-section.schema';

interface BannerResponse {
  data: any[];
  success?: boolean;
  message?: string;
}

type HomeBuildInput = {
  verticales: any[];
  banners: any[];
  productos: any[];
  jota: any;
  ofertas: any[];
};

@Injectable()
export class HomeService implements OnModuleInit {
  private readonly logger = new Logger(HomeService.name);
  private fieldsImage = ['nombre', 'imagen', 'variante', 'estado', 'meta'];
  constructor(
    private readonly resilientService: ResilientService,
    private readonly fallbackDataService: FallbackDataService,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    @Inject('IMAGE_SERVICE') private readonly imageClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly verticalesService: VerticalesService,
    private readonly homeSectionsService: HomeSectionsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}


  private readonly FRESH_MS = 60 * 1000;
  private readonly REDIS_TTL_S = 60 * 60;
  private readonly revalidating = new Set<string>();

  private redisKey(category: string, limit: number, offset: number): string {
    return `home:v1:${category}:${limit}:${offset}`;
  }

  async onModuleInit(): Promise<void> {
    setTimeout(() => {
      this.getHomeData({ limit: 10, offset: 0 } as FilterHomeDto).catch((e) =>
        this.logger.warn(`Pre-warm del home falló: ${e?.message ?? e}`),
      );
    }, 0);
  }

  async getHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    const limit = filter.limit || 6;
    const offset = filter.offset || 0;
    const category = filter.category || 'all';
    const key = this.redisKey(category, limit, offset);
    const now = Date.now();

    try {
      const raw = await this.redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: ResponseData<HomeData> };
        const age = now - (parsed.ts || 0);
        if (age < this.FRESH_MS) return parsed.data;
        this.revalidateInBackground(filter, key);
        return parsed.data;
      }
    } catch (e) {
      this.logger.warn(`Redis get falló para ${key}: ${(e as any)?.message ?? e}`);
    }

    const data = await this.buildHomeData(filter);
    await this.writeCache(key, data);
    return data;
  }

  private revalidateInBackground(filter: FilterHomeDto, key: string): void {
    if (this.revalidating.has(key)) return;
    this.revalidating.add(key);
    this.buildHomeData(filter)
      .then((fresh) => this.writeCache(key, fresh))
      .catch((e) => this.logger.warn(`Revalidación de ${key} falló: ${e?.message ?? e}`))
      .finally(() => this.revalidating.delete(key));
  }

  private async writeCache(key: string, data: ResponseData<HomeData>): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify({ ts: Date.now(), data }),
        'EX',
        this.REDIS_TTL_S,
      );
    } catch (e) {
      this.logger.warn(`Redis set falló para ${key}: ${(e as any)?.message ?? e}`);
    }
  }

  private async buildHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    const limit = filter.limit || 6;
    const offset = filter.offset || 0;

    try {
      const resilientOptions: ResilientOptions = {
        retries: 3,
        delay: 1000,
        fallback: async () => {
          this.logger.warn('Using fallback products');
          return {
            data: this.fallbackDataService.getFallbackProducts(limit),
            total: this.fallbackDataService.getFallbackProducts().length,
          };
        },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 30000,
        },
      };

      const bannerOptions: ResilientOptions = {
        retries: 3,
        delay: 1000,
        fallback: async () => ({ data: [], message: 'fallback banners', success: true }),
        circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
      };
      const [verticales, banners, jota, ofertas, productos] = await Promise.all([
        this.verticalesService.findAll({ page: 1, limit: 5 }),
        this.resilientService.sendWithResilience(
          this.imageClient,
          { cmd: 'get_all_banners' },
          { fields: this.fieldsImage },
          bannerOptions,
        ) as Promise<BannerResponse>,
        this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_products_jota' },
          {
            limit,
            offset,
            marca: "257"
          },
          resilientOptions,
        ) as Promise<any>,
        this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_ofertas' },
          {
            limit,
            offset,
          },
          resilientOptions,
        ) as Promise<any>,
        this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_products' },
          {
            limit,
            offset,
          },
          resilientOptions,
        ) as Promise<any>,
      ]);
      this.logger.log(`[home] get_all_banners → ${Array.isArray((banners as any)?.data) ? (banners as any).data.length : 'sin data'} banners`);

      this.fallbackDataService.saveSuccessfulResponse(productos, 'products');
      this.fallbackDataService.saveSuccessfulResponse(jota, 'jota');
      const response = new ResponseData<HomeData>();
      const sections = await this.buildHomeSections({
        verticales: verticales.data || [],
        banners: banners.data || [],
        productos: productos.data || [],
        jota: jota || [],
        ofertas: ofertas.data || [],
      });
      response.data = {
        sections,
        categorias: this.buildCategorias(),
      };
      response.status = 200;
      response.register = productos.total || 0;
      return response;
    } catch (error) {
      this.logger.error('Error en buildHomeData:', error);
      const fallbackProducts =
        this.fallbackDataService.getFallbackProducts(limit);
      const fallbackJota = this.fallbackDataService.getFallbackJota();
      const response = new ResponseData<HomeData>();
      const sections = await this.buildHomeSections({
        verticales: [],
        banners: [],
        productos: fallbackProducts,
        jota: fallbackJota,
        ofertas: [],
      });
      response.data = {
        sections,
        categorias: this.buildCategorias(),
      };
      response.status = 200;
      response.register = fallbackProducts.length;

      return response;
    }
  }

  private async buildHomeSections(input: HomeBuildInput): Promise<HomeSectionResponse[]> {
    const dbSections = await this.homeSectionsService.getActiveSections();
    const sections = dbSections.length > 0 ? dbSections : this.getDefaultSections();
    let jotaData: any = (input as any).jota?.data ?? input.jota ?? [];
    let jotaTotal: any = (input as any).jota?.total ?? null;
    const jotaSection = sections.find((s) => s.type === 'JOTA');
    const jotaCodigos: string[] = Array.isArray((jotaSection?.config as any)?.codigos)
      ? (jotaSection!.config as any).codigos
          .map((c: any) => String(typeof c === 'string' ? c : c?.codigo ?? '').trim())
          .filter(Boolean)
      : [];
    if (jotaCodigos.length > 0) {
      try {
        const res: any = await firstValueFrom(
          this.productsClient.send(
            { cmd: 'get_products_by_codigos' },
            { codigos: jotaCodigos, limit: 30 },
          ),
        );
        const data = res?.data ?? res ?? [];
        if (Array.isArray(data) && data.length > 0) {
          jotaData = data;
          jotaTotal = res?.total ?? data.length;
        }
      } catch (e) {
        this.logger.warn(`No se pudo resolver JOTA por codigos: ${e}`);
      }
    }

    const ofertasSection = sections.find((s) => s.type === 'OFERTAS');
    const ofertasCfg: any = ofertasSection?.config || {};
    let ofertaPayload: any = null;
    if (ofertasCfg.ofertaId) {
      try {
        const ofRes: any = await firstValueFrom(
          this.productsClient.send(
            { cmd: 'get_oferta_by_id' },
            { id: Number(ofertasCfg.ofertaId) },
          ),
        );
        const oferta = ofRes?.data;
        if (oferta) {
          const productos: any[] = Array.isArray(oferta.productos) ? oferta.productos : [];
          const codigos = productos
            .map((p) => String(p?.codigo_articulo ?? '').trim())
            .filter(Boolean);
          let catalogoByCod = new Map<string, any>();
          if (codigos.length > 0) {
            try {
              const catRes: any = await firstValueFrom(
                this.productsClient.send(
                  { cmd: 'get_products_by_codigos' },
                  { codigos, limit: codigos.length },
                ),
              );
              const catData: any[] = catRes?.data ?? [];
              catalogoByCod = new Map(
                catData.map((c) => [String(c?.codigo_articulo ?? '').trim(), c]),
              );
            } catch {
            }
          }
          const sin18General = !!ofertasCfg.cuotasSinInteres18;
          const sin18Override: Record<string, boolean> =
            (ofertasCfg.sin18Override && typeof ofertasCfg.sin18Override === 'object')
              ? ofertasCfg.sin18Override
              : {};
          const productosEnriquecidos = productos.map((p) => {
            const cod = String(p?.codigo_articulo ?? '').trim();
            const cat = catalogoByCod.get(cod) || {};
            const sinInteres18 =
              cod in sin18Override ? !!sin18Override[cod] : sin18General;
            return {
              ...p,
              imagenes: Array.isArray(cat?.imagenes) ? cat.imagenes : [],
              nombre_marca: cat?.nombre_marca ?? null,
              nombre_subcategoria: cat?.nombre_subcategoria ?? null,
              precioCatalogo: cat?.precioventaRedondeado ?? cat?.precioventa ?? null,
              precioTope: cat?.preciotope ?? null,
              cuotas: Array.isArray(cat?.cuotas) ? cat.cuotas : undefined,
              sinInteres18,
            };
          });
          ofertaPayload = {
            ofertaId: oferta.id,
            titulo: oferta.titulo,
            descripcion: oferta.descripcion,
            fechaInicio: ofertasCfg.fechaInicio ?? null,
            fechaFin: ofertasCfg.fechaFin ?? null,
            tema: ofertasCfg.tema ?? null,
            combosHabilitado: !!oferta.combosHabilitado,
            comboDescuento: Number(oferta.comboDescuento) || 0,
            productos: productosEnriquecidos,
          };
        }
      } catch (e) {
        this.logger.warn(`No se pudo resolver OFERTAS por ofertaId: ${e}`);
      }
    }

    const banners = Array.isArray(input.banners) ? input.banners : [];
    const bannersByNombre = new Map<string, any>();
    for (const b of banners) {
      const nombre = String((b as any)?.nombre || '').trim();
      if (nombre) bannersByNombre.set(nombre, b);
    }
    const bannersByVariante = new Map<string, any[]>();
    for (const b of banners) {
      const variante = String((b as any)?.variante || '').trim().toLowerCase();
      const key = variante || 'default';
      if (!bannersByVariante.has(key)) bannersByVariante.set(key, []);
      bannersByVariante.get(key)!.push(b);
    }

    const baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');
    const bannerUrl = (nombre: string, device: string = 'desktop') => {
      if (!nombre) return null;
      const path = `/image/banner/${encodeURIComponent(nombre)}/${device}`;
      return baseUrl ? `${baseUrl}${path}` : path;
    };

    const resolveBanners2Payload = (cfg: Record<string, any> | undefined) => {
      const c: any = cfg && typeof cfg === 'object' ? cfg : {};
      const withImg = (slot: any) => {
        if (!slot || typeof slot !== 'object') return slot ?? null;
        const nombre = String(slot?.nombre || '').trim();
        return { ...slot, imageUrl: nombre ? bannerUrl(nombre, 'desktop') : null };
      };
      return {
        theme: c.theme ?? null,
        heroTop: withImg(c.heroTop),
        features: Array.isArray(c.features) ? c.features.map(withImg) : [],
        promos: Array.isArray(c.promos) ? c.promos.map(withImg) : [],
        heroBottom: withImg(c.heroBottom),
      };
    };

    const resolveBannerPayload = (cfg: Record<string, any> | undefined) => {
      const heroSlidesRaw = (cfg as any)?.heroSlides;
      if (Array.isArray(heroSlidesRaw) && heroSlidesRaw.length > 0) {
        const out: any[] = [];
        const seen = new Set<string>();
        for (const it of heroSlidesRaw) {
          const mediaType = String(it?.mediaType || 'image');
          if (mediaType === 'video') {
            const videoUrl = String(it?.videoUrl || '').trim();
            if (!videoUrl) continue;
            out.push({
              nombre: null,
              variante: 'video',
              estado: 'activo',
              meta: {
                title: it?.title ?? null,
                subtitle: it?.subtitle ?? null,
                ctaText: it?.ctaText ?? null,
                href: it?.href ?? null,
                mediaType: 'video',
                videoUrl,
                order: Number(it?.order ?? 0),
              },
            });
            continue;
          }

          const nombre = String(it?.nombre || '').trim();
          if (!nombre || seen.has(nombre)) continue;
          const b = bannersByNombre.get(nombre);
          if (!b) continue;
          seen.add(nombre);

          const order = Number(it?.order ?? 0);
          const meta =
            (b as any)?.meta && typeof (b as any).meta === 'object'
              ? (b as any).meta
              : {};

          out.push({
            ...b,
            meta: {
              ...meta,
              title: it?.title ?? meta?.title,
              subtitle: it?.subtitle ?? meta?.subtitle,
              ctaText: it?.ctaText ?? meta?.ctaText,
              href: it?.href ?? meta?.href,
              mediaType: 'image',
              imageUrl: bannerUrl(nombre, 'desktop'),
              order: Number.isFinite(order) ? order : meta?.order,
            },
          });
        }
        return out.map((b: any, idx: number) => {
          const o = Number(b?.meta?.order);
          const hasO = !Number.isNaN(o) && o !== 0;
          return hasO ? b : { ...b, meta: { ...(b.meta || {}), order: (idx + 1) * 10 } };
        });
      }

      const bannerItemsRaw = (cfg as any)?.bannerItems;
      if (Array.isArray(bannerItemsRaw) && bannerItemsRaw.length > 0) {
        const out: any[] = [];
        const seen = new Set<string>();
        for (const it of bannerItemsRaw) {
          const nombre = String(it?.nombre || '').trim();
          if (!nombre || seen.has(nombre)) continue;
          const b = bannersByNombre.get(nombre);
          if (!b) continue;
          seen.add(nombre);

          const slot = it?.slot === 'top' ? 'top' : 'bottom';
          const order = Number(it?.order ?? 0);
          const meta =
            (b as any)?.meta && typeof (b as any).meta === 'object'
              ? (b as any).meta
              : {};
          const itemMeta =
            (it as any)?.meta && typeof (it as any).meta === 'object'
              ? (it as any).meta
              : {};

          out.push({
            ...b,
            meta: {
              ...meta,
              ...itemMeta,
              slot,
              order: Number.isFinite(order) ? order : itemMeta?.order ?? meta?.order,
              imageUrl: bannerUrl(nombre, 'desktop'),
            },
          });
        }
        return out;
      }

      const variantes: string[] = Array.isArray(cfg?.variantes) ? cfg!.variantes : [];
      if (variantes.length === 0) return [];
      const merged: any[] = [];
      for (const v of variantes) {
        const arr = bannersByVariante.get(String(v).trim().toLowerCase());
        if (arr && arr.length > 0) merged.push(...arr);
      }

      return merged.sort((a: any, b: any) => {
        const ao = Number(a?.meta?.order);
        const bo = Number(b?.meta?.order);
        const hasAo = !Number.isNaN(ao);
        const hasBo = !Number.isNaN(bo);
        if (hasAo && hasBo && ao !== bo) return ao - bo;
        if (hasAo && !hasBo) return -1;
        if (!hasAo && hasBo) return 1;
        const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
    };

    // PRODUCTOS config-driven: cada sección PRODUCTOS puede traer productos
    // puntuales (config.codigos) o un set aleatorio acotado a productos con
    // stock y precio (config.modo === 'aleatorio', ej. "Lo Más Vendido").
    const productosByKey = new Map<string, any[]>();
    for (const s of sections) {
      const t = s.type as HomeSectionType;
      if (t !== 'PRODUCTOS' && t !== 'PRODUCT_CAROUSEL') continue;
      const cfg: any = s.config || {};
      const codigos: string[] = Array.isArray(cfg.codigos)
        ? cfg.codigos
            .map((c: any) => String(typeof c === 'string' ? c : c?.codigo ?? '').trim())
            .filter(Boolean)
        : [];
      try {
        if (codigos.length > 0) {
          const res: any = await firstValueFrom(
            this.productsClient.send(
              { cmd: 'get_products_by_codigos' },
              { codigos, limit: codigos.length },
            ),
          );
          productosByKey.set(s.key, res?.data ?? res ?? []);
        } else if (cfg.modo === 'aleatorio' || s.key === 'lo_mas_vendido') {
          const limit = Number(cfg.limit) > 0 ? Number(cfg.limit) : 20;
          const pool = Number(cfg.pool) > 0 ? Number(cfg.pool) : Math.max(limit * 3, 60);
          const res: any = await firstValueFrom(
            this.productsClient.send(
              { cmd: 'get_products' },
              { limit: pool, offset: 0, soloConStock: true, precioMin: 1 },
            ),
          );
          const data: any[] = Array.isArray(res?.data) ? [...res.data] : [];
          // Barajado Fisher-Yates y corte al límite.
          for (let i = data.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [data[i], data[j]] = [data[j], data[i]];
          }
          productosByKey.set(s.key, data.slice(0, limit));
        }
      } catch (e) {
        this.logger.warn(`No se pudo resolver PRODUCTOS (${s.key}): ${e}`);
      }
    }

    return sections.map((s) => {
      const section: HomeSectionResponse = {
        key: s.key,
        type: s.type,
        orden: s.orden,
        titulo: s.titulo ?? null,
        payload: null,
      };

      switch (s.type as HomeSectionType) {
        case 'HERO':
          section.payload = {
            banners: resolveBannerPayload(s.config) || [],
            heroSplitPct: Number((s.config as any)?.heroSplitPct ?? 50),
          };
          break;
        case 'VERTICALES':
          section.payload = {
            items: input.verticales || [],
          };
          break;
        case 'BANNERS':
          section.payload = {
            banners: resolveBannerPayload(s.config) || [],
          };
          break;
        case 'BANNERS2':
          section.payload = resolveBanners2Payload(s.config);
          break;
        case 'OFERTAS':
          // Si hay oferta configurada en el admin, se usa ese payload enriquecido
          // (título/desc/fechas/tema/productos). Si no, fallback al listado general.
          section.payload = ofertaPayload
            ? { oferta: ofertaPayload, ofertas: input.ofertas || [] }
            : { ofertas: input.ofertas || [] };
          break;
        case 'JOTA':
          section.payload = {
            data: jotaData,
            total: jotaTotal,
          };
          break;
        case 'IMAGE_GRID': {
          const cfgGrid: any = s.config || {};
          const mapCelda = (c: any) => {
            const nombre = String(c?.imagenNombre || c?.nombre || '').trim();
            return {
              imagenNombre: nombre || null,
              imageUrl: nombre ? bannerUrl(nombre, 'desktop') : null,
              title: c?.title ?? null,
              subtitle: c?.subtitle ?? null,
              ctaText: c?.ctaText ?? null,
              href: c?.href ?? null,
            };
          };
          // Layout por filas (cada fila con su nº de columnas). Fallback al
          // formato viejo (columnas + celdas planas) → una sola fila.
          let filas: any[] = [];
          if (Array.isArray(cfgGrid.filas) && cfgGrid.filas.length > 0) {
            filas = cfgGrid.filas.map((f: any) => ({
              columnas: Math.max(1, Math.min(4, Number(f?.columnas) || 3)),
              items: (Array.isArray(f?.celdas) ? f.celdas : []).map(mapCelda),
            }));
          } else if (Array.isArray(cfgGrid.celdas) && cfgGrid.celdas.length > 0) {
            filas = [{ columnas: Math.max(1, Math.min(4, Number(cfgGrid.columnas) || 3)), items: cfgGrid.celdas.map(mapCelda) }];
          }
          section.payload = { filas };
          break;
        }
        case 'PRODUCT_CAROUSEL': {
          const cfgPc: any = s.config || {};
          section.payload = {
            productos: productosByKey.get(s.key) ?? input.productos ?? [],
            titulo: (cfgPc.tituloOferta && String(cfgPc.tituloOferta).trim()) || s.titulo || null,
            descripcion: cfgPc.descripcion ?? null,
            colores: cfgPc.colores ?? null,
            variante: cfgPc.variante === 'ofertas' ? 'ofertas' : 'titulo',
            tipografia: cfgPc.tipografia ?? null,
            modo: cfgPc.modo ?? null,
          };
          break;
        }
        case 'PRODUCTOS':
        default:
          section.payload = {
            productos: productosByKey.get(s.key) ?? input.productos ?? [],
            titulo: s.titulo ?? null,
          };
          break;
      }
      return section;
    });
  }

  /**
   * Resuelve el carrusel personalizado "Compras de usuarios" para un usuario
   * concreto. NO pasa por el cache global del Home: se llama desde un endpoint
   * autenticado aparte. Deriva las marcas más compradas del usuario (cart) y
   * trae productos de esa marca (products). Si el usuario no tiene compras,
   * devuelve un set aleatorio como fallback (mismo comportamiento que 'aleatorio').
   */
  async buildPersonalizedCarousel(
    userId: number | string,
    key: string,
  ): Promise<ResponseData<any>> {
    const build = (data: any, message: string, status: number): ResponseData<any> => {
      const r = new ResponseData<any>();
      r.data = data;
      r.message = message;
      r.status = status;
      r.register = Array.isArray(data?.productos) ? data.productos.length : 0;
      return r;
    };
    try {
      const section = await this.homeSectionsService.getByKey(key);
      if (!section || (section.type as HomeSectionType) !== 'PRODUCT_CAROUSEL') {
        return build(null, 'Sección no encontrada', 404);
      }
      const cfg: any = section.config || {};
      const limit = Number(cfg.limit) > 0 ? Number(cfg.limit) : 12;

      let productos: any[] = [];
      let marcaNombre: string | null = null;

      // 1) Top marcas del usuario a partir de sus compras finalizadas.
      let top: any = null;
      try {
        top = await firstValueFrom(
          this.cartClient.send({ cmd: 'get_user_top_categorias' }, { userId, limit: 5 }),
        );
      } catch (e) {
        this.logger.warn(`No se pudo obtener top de compras (user ${userId}): ${e}`);
      }
      const marcas: Array<{ codigo: string; nombre: string | null }> = top?.data?.marcas ?? [];

      // 2) Traer productos con stock de esas marcas (en orden de preferencia).
      for (const m of marcas) {
        if (productos.length >= limit) break;
        try {
          const res: any = await firstValueFrom(
            this.productsClient.send(
              { cmd: 'get_products' },
              { marca: m.codigo, limit: limit * 2, offset: 0, soloConStock: true, precioMin: 1 },
            ),
          );
          const data: any[] = Array.isArray(res?.data) ? res.data : [];
          if (data.length && !marcaNombre) marcaNombre = m.nombre;
          const vistos = new Set(productos.map((p) => String(p.codigo ?? p.codigo_articulo)));
          for (const p of data) {
            const cod = String(p.codigo ?? p.codigo_articulo);
            if (!vistos.has(cod)) {
              vistos.add(cod);
              productos.push(p);
            }
          }
        } catch (e) {
          this.logger.warn(`No se pudieron traer productos de marca ${m.codigo}: ${e}`);
        }
      }

      // 3) Fallback: sin compras (o sin resultados) → aleatorio con stock.
      if (productos.length === 0) {
        try {
          const res: any = await firstValueFrom(
            this.productsClient.send(
              { cmd: 'get_products' },
              { limit: Math.max(limit * 3, 60), offset: 0, soloConStock: true, precioMin: 1 },
            ),
          );
          const data: any[] = Array.isArray(res?.data) ? [...res.data] : [];
          for (let i = data.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [data[i], data[j]] = [data[j], data[i]];
          }
          productos = data.slice(0, limit);
        } catch (e) {
          this.logger.warn(`Fallback aleatorio del carrusel personalizado falló: ${e}`);
        }
      }

      const payload = {
        productos: productos.slice(0, limit),
        titulo:
          (cfg.tituloOferta && String(cfg.tituloOferta).trim()) ||
          section.titulo ||
          (marcaNombre ? `Lo mejor de ${marcaNombre} para vos` : 'Elegido para vos'),
        descripcion: cfg.descripcion ?? null,
        colores: cfg.colores ?? null,
        variante: cfg.variante === 'ofertas' ? 'ofertas' : 'titulo',
        tipografia: cfg.tipografia ?? null,
        modo: 'compras_usuario',
        personalizado: marcas.length > 0 && productos.length > 0,
      };
      return build(payload, 'Carrusel personalizado', 200);
    } catch (error) {
      this.logger.error('Error al construir carrusel personalizado', error as any);
      return build(null, 'Error al construir carrusel personalizado', 500);
    }
  }

  private getDefaultSections(): HomeSection[] {
    return [
      {
        id: 0,
        key: 'hero',
        type: 'HERO',
        orden: 10,
        activo: true,
        titulo: null as any,
        config: { variantes: ['hero', 'home-hero', 'slider'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'verticales',
        type: 'VERTICALES',
        orden: 20,
        activo: true,
        titulo: null as any,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'promo_banners',
        type: 'BANNERS',
        orden: 30,
        activo: true,
        titulo: null as any,
        config: { variantes: ['promo', 'promos', 'home-promo'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'ofertas',
        type: 'OFERTAS',
        orden: 40,
        activo: true,
        titulo: 'Ofertas',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'jota',
        type: 'JOTA',
        orden: 50,
        activo: true,
        titulo: 'JOTA',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'lo_mas_vendido',
        type: 'PRODUCTOS',
        orden: 55,
        activo: true,
        titulo: 'Lo Más Vendido',
        config: { modo: 'aleatorio', limit: 20 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'banners_secundarios',
        type: 'BANNERS2',
        orden: 57,
        activo: true,
        titulo: null as any,
        config: { variantes: ['banners2'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 0,
        key: 'productos',
        type: 'PRODUCTOS',
        orden: 60,
        activo: true,
        titulo: 'Productos',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as HomeSection[];
  }

  private buildCategorias(): HomeCategoriaFamilia[] {
    const subfamiliasByFamiliaId = new Map<number, any[]>();
    for (const s of SubFamilias) {
      if (!subfamiliasByFamiliaId.has(s.familiaId)) {
        subfamiliasByFamiliaId.set(s.familiaId, []);
      }
      subfamiliasByFamiliaId.get(s.familiaId)!.push(s);
    }

    return FamiliasConId.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      subfamilias: (subfamiliasByFamiliaId.get(f.id) || []).map((s) => ({
        id: s.id,
        subfamiliaId: s.subfamiliaId,
        familiaId: s.familiaId,
        nombre: s.nombre,
      })),
    }));
  }
}
