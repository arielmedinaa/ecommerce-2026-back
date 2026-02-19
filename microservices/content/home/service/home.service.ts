import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData } from '@content/home/interfaces/home.interface';
import { ResponseData } from '@gateway/common/response/response.data';
import { ImageService } from '@image/image.service';
import { ResilientService, ResilientOptions } from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private readonly imageService: ImageService,
    private readonly resilientService: ResilientService,
    private readonly fallbackDataService: FallbackDataService,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  private get mockBanners() {
    return [
      {
        id: '1',
        title: 'Navidad',
        description: 'Up to 50% off on selected items',
        imageUrl:
          'https://csdigitalizacion.nyc3.cdn.digitaloceanspaces.com/ecommerce/publicidad/banner/417894449.png',
        url: '/navidad',
        order: 1,
      },
      {
        id: '2',
        title: 'Entrega',
        description: 'Discover our latest collection',
        imageUrl: this.imageService.getImageUrl('centralShopEntrega.webp'),
        url: '/entrega',
        order: 2,
      },
    ];
  }

  private homeDataCache: Map<
    string,
    { data: ResponseData<HomeData>; timestamp: number }
  > = new Map();
  private readonly HOME_TTL = 30 * 1000;

  private categoriasCache: string[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private async getCachedCategorias(): Promise<string[]> {
    const now = Date.now();
    if (
      this.categoriasCache.length === 0 ||
      now - this.lastCacheUpdate > this.CACHE_TTL
    ) {
      try {
        const resilientOptions: ResilientOptions = {
          retries: 3,
          delay: 1000,
          fallback: async () => {
            this.logger.warn('Using fallback categories');
            return this.fallbackDataService.getFallbackCategories();
          },
          circuitBreaker: {
            failureThreshold: 3,
            resetTimeout: 30000,
          },
        };

        const result: any = await this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_categories' },
          {},
          resilientOptions,
        );
        
        this.categoriasCache = result.categorias || [];
        this.lastCacheUpdate = now;
        this.fallbackDataService.saveSuccessfulResponse(result, 'categories');
      } catch (error) {
        this.logger.error('Error al obtener categorías:', error);
        this.categoriasCache = this.fallbackDataService.getFallbackCategories();
      }
    }

    return this.categoriasCache;
  }

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

      const [productos, categorias] = await Promise.all([
        this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_products' },
          {
            limit,
            offset,
            categoria: filter.category,
            fields: [
              'nombre',
              'precio',
              'venta',
              'ruta',
              'imagenes',
              'descuento',
            ],
          },
          resilientOptions,
        ) as Promise<any>,
        this.getCachedCategorias(),
      ]);

      this.fallbackDataService.saveSuccessfulResponse(productos, 'products');
      const response = new ResponseData<HomeData>();
      response.data = {
        banners: this.mockBanners,
        productos: productos.data || [],
        categorias: categorias,
      };
      response.status = 200;
      response.register = productos.total || 0;
      this.homeDataCache.set(cacheKey, { data: response, timestamp: now });
      return response;
    } catch (error) {
      this.logger.error('Error en getHomeData:', error);
      const fallbackProducts = this.fallbackDataService.getFallbackProducts(limit);
      const fallbackCategories = this.fallbackDataService.getFallbackCategories();
      
      const response = new ResponseData<HomeData>();
      response.data = {
        banners: this.mockBanners,
        productos: fallbackProducts,
        categorias: fallbackCategories,
      };
      response.status = 200;
      response.register = fallbackProducts.length;
      
      return response;
    }
  }
}
