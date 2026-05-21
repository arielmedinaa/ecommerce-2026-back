import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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
export class HomeService {
  private readonly logger = new Logger(HomeService.name);
  private fieldsImage = ['nombre', 'imagen', 'variante', 'estado', 'meta'];
  constructor(
    private readonly resilientService: ResilientService,
    private readonly fallbackDataService: FallbackDataService,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    @Inject('IMAGE_SERVICE') private readonly imageClient: ClientProxy,
    private readonly verticalesService: VerticalesService,
    private readonly homeSectionsService: HomeSectionsService,
  ) {}

  private homeDataCache: Map<
    string,
    { data: ResponseData<HomeData>; timestamp: number }
  > = new Map();
  private readonly HOME_TTL = 30 * 1000;

  async getHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    const limit = filter.limit || 6;
    const offset = filter.offset || 0;
    const category = filter.category || 'all';

    const cacheKey = `home_${category}_${limit}_${offset}`;
    const now = Date.now();

    const cached = this.homeDataCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.HOME_TTL) {
      return cached.data;
    }

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

      const verticales = await this.verticalesService.findAll({page: 1, limit: 5});
      const banners = await this.resilientService.sendWithResilience(
        this.imageClient,
        { cmd: 'get_all_banners' },
        { fields: this.fieldsImage },
        resilientOptions,
      ) as BannerResponse;
      const [jota, ofertas, productos] = await Promise.all([
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
      this.homeDataCache.set(cacheKey, { data: response, timestamp: now });
      return response;
    } catch (error) {
      this.logger.error('Error en getHomeData:', error);
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

    const resolveBannerPayload = (cfg: Record<string, any> | undefined) => {
      const baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');
      const bannerUrl = (nombre: string, device: string = 'desktop') => {
        if (!nombre) return null;
        const path = `/image/banner/${encodeURIComponent(nombre)}/${device}`;
        return baseUrl ? `${baseUrl}${path}` : path;
      };

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

          out.push({
            ...b,
            meta: {
              ...meta,
              slot,
              order: Number.isFinite(order) ? order : meta?.order,
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
        case 'OFERTAS':
          section.payload = {
            ofertas: input.ofertas || [],
          };
          break;
        case 'JOTA':
          section.payload = {
            data: (input as any).jota?.data ?? input.jota ?? [],
            total: (input as any).jota?.total ?? null,
          };
          break;
        case 'PRODUCTOS':
        default:
          section.payload = {
            productos: input.productos || [],
          };
          break;
      }
      return section;
    });
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
