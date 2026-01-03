import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData } from '@content/home/interfaces/home.interface';
import { ResponseData } from '@gateway/common/response/response.data';
import { ImageService } from '@image/image.service';
import { Product } from '@products/schemas/product.schema';

@Injectable()
export class HomeService {
  constructor(private readonly imageService: ImageService, private readonly productModel: Model<Product>) {}

  private get mockBanners() {
    return [
      {
        id: '1',
        title: 'Navidad',
        description: 'Up to 50% off on selected items',
        imageUrl: 'https://csdigitalizacion.nyc3.cdn.digitaloceanspaces.com/ecommerce/publicidad/banner/417894449.png',
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

  private categoriasCache: string[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private async getCachedCategorias(): Promise<string[]> {
    const now = Date.now();
    if (this.categoriasCache.length === 0 || now - this.lastCacheUpdate > this.CACHE_TTL) {
      const pipeline: any[] = [
        { $unwind: "$categorias" },
        { $group: { _id: "$categorias" } },
        { $sort: { _id: 1 } },
        { $limit: 20 },
        { $project: { _id: 0, categoria: "$_id" } }
      ];
      
      const result = await this.productModel.aggregate(pipeline).exec();
      this.categoriasCache = result.map(item => item.categoria);
      this.lastCacheUpdate = now;
    }
    
    return this.categoriasCache;
  }

  async getHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    const limit = filter.limit || 6;
    const offset = filter.offset || 0;

    const query: any = {};
    if (filter.category) {
      query.categorias = filter.category;
    }

    const productosPromise = this.productModel.find()
      .limit(limit)
      .skip(offset)
      .sort({ tiempo: -1 })
      .lean();

    const countPromise = offset === 0 && !filter.category 
      ? Promise.resolve(1000) 
      : this.productModel.countDocuments(query);

    const [productos, total, categorias] = await Promise.all([
      productosPromise,
      countPromise,
      this.getCachedCategorias()
    ]);
      
    const response = new ResponseData<HomeData>();
    response.data = {
      banners: this.mockBanners,
      productos: productos as any,
      categorias: categorias,
    };
    response.status = 200;
    response.register = total;

    return response;
  }
}
