import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData } from '@content/home/interfaces/home.interface';
import { ResponseData } from '@gateway/common/response/response.data';
import { ImageService } from '@image/image.service';

@Injectable()
export class HomeService {
  constructor(
    private readonly imageService: ImageService,
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
        const result = await firstValueFrom(
          this.productsClient.send({ cmd: 'get_categories' }, {}),
        );
        this.categoriasCache = result.categorias || [];
        this.lastCacheUpdate = now;
      } catch (error) {
        console.error('Error al obtener categorías:', error);
        this.categoriasCache = [];
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
      const [productos, categorias] = await Promise.all([
        firstValueFrom(
          this.productsClient.send(
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
          ),
        ),
        this.getCachedCategorias(),
      ]);

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
      console.error('Error en getHomeData:', error);
      const response = new ResponseData<HomeData>();
      response.data = {
        banners: this.mockBanners,
        productos: [],
        categorias: [],
      };
      response.status = 500;
      response.register = 0;
      return response;
    }
  }
}
