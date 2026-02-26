import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData } from '@content/home/interfaces/home.interface';
import { ResponseData } from '@gateway/common/response/response.data';
import {
  ResilientService,
  ResilientOptions,
} from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';

interface BannerResponse {
  data: any[];
  success?: boolean;
  message?: string;
}

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  private fieldsImage = ['nombre', 'imagen', 'variante', 'estado'];

  constructor(
    private readonly resilientService: ResilientService,
    private readonly fallbackDataService: FallbackDataService,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    @Inject('IMAGE_SERVICE') private readonly imageClient: ClientProxy,
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
          {},
          resilientOptions,
        ) as Promise<any>,
        this.resilientService.sendWithResilience(
          this.productsClient,
          { cmd: 'get_ofertas' },
          {},
          resilientOptions,
        ) as Promise<any>,
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
      ]);

      this.fallbackDataService.saveSuccessfulResponse(productos, 'products');
      this.fallbackDataService.saveSuccessfulResponse(jota, 'jota');
      const response = new ResponseData<HomeData>();
      response.data = {
        banners: banners.data || [],
        productos: productos.data || [],
        jota: jota || [],
        ofertasExpress: ofertas.data || [],
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
      response.data = {
        banners: [],
        productos: fallbackProducts,
        jota: fallbackJota,
        ofertasExpress: [],
      };
      response.status = 200;
      response.register = fallbackProducts.length;

      return response;
    }
  }
}
