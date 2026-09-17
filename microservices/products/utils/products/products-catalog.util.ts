import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../schemas/products/product.schemas';
import { ProductsImage } from '../../schemas/products/products-image.schema';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { ProductsUtils } from './utils-products';
import { ProductsResilienceUtil } from './products-resilience.util';

@Injectable()
export class ProductsCatalogUtil {
  private readonly logger = new Logger(ProductsCatalogUtil.name);
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly STALE_TTL = 24 * 60 * 60 * 1000;
  private readonly inFlightListQueries = new Map<string, Promise<{ data: any[]; total: number }>>();

  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    private readonly productsUtils: ProductsUtils,
    private readonly cache: CachePersistenteService,
    private readonly resilience: ProductsResilienceUtil,
  ) {}

  getCacheKey(filters: any): string {
    return JSON.stringify({
      limit: filters.limit,
      offset: filters.offset,
      categoria: filters.categoria,
      subcategoria: filters.subcategoria,
      proveedor: filters.proveedor,
      precioMin: filters.precioMin,
      precioMax: filters.precioMax,
      soloConStock: filters.soloConStock,
      soloConImagenes: filters.soloConImagenes,
      search: filters.search,
      busqueda: filters.busqueda,
      nombre: filters.nombre,
      marca: filters.marca,
    });
  }

  async getCachedPrismaProductos(
    filters: any = {},
    WEB_BASE_WHERE: string,
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:list:${this.getCacheKey(filters)}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) {
      return { data: cached.data, total: cached.total };
    }

    const inFlight = this.inFlightListQueries.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = this.fetchAndCachePrismaProductos(filters, cacheKey, WEB_BASE_WHERE);
    this.inFlightListQueries.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightListQueries.delete(cacheKey);
    }
  }

  private async runProcParaTerminos(
    baseParams: {
      limit: number;
      offset: number;
      marca: any;
      categoria: any;
      proveedor: any;
      precioMin: any;
      precioMax: any;
      soloStock: any;
    },
    terminos: string[],
  ): Promise<any[]> {
    const busqueda = terminos.slice(0, 4).join('||');
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_articulos_ecommerce_web(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        baseParams.limit,
        baseParams.offset,
        baseParams.marca,
        baseParams.categoria,
        baseParams.proveedor,
        baseParams.precioMin,
        baseParams.precioMax,
        baseParams.soloStock,
        busqueda,
      ],
    );
    return (result[0] || []).slice(0, baseParams.limit);
  }

  private async fetchAndCachePrismaProductos(
    filters: any,
    cacheKey: string,
    WEB_BASE_WHERE: string,
  ): Promise<{ data: any[]; total: number }> {
    const MAX_LIMIT = 100;
    const FULL_FETCH_LIMIT = 5000;
    const soloConImagenes = !!filters.soloConImagenes;
    const rawLimit = Number(filters.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : 50;
    const offset = Number(filters.offset) || 0;
    const f = this.productsUtils.buildProcFilters(filters);
    const { terms } = f.busqueda
      ? this.productsUtils.expandBusquedaTerms(f.busqueda)
      : { terms: [] as string[] };

    const fetchLimit = soloConImagenes ? FULL_FETCH_LIMIT : limit;
    const fetchOffset = soloConImagenes ? 0 : offset;
    const baseParams = {
      limit: fetchLimit,
      offset: fetchOffset,
      marca: f.marca,
      categoria: f.categoria,
      proveedor: f.proveedor,
      precioMin: f.precioMin,
      precioMax: f.precioMax,
      soloStock: f.soloStock,
    };

    const staleKey = `products:list:stale:${cacheKey}`;

    let dataConCuotas: any[];
    let total: number;
    try {
      const result = await this.resilience.withTimeout(
        (async () => {
          const productos =
            terms.length > 1
              ? await this.runProcParaTerminos(baseParams, terms)
              : await this.productReadRepository
                  .query(
                    'CALL proc_obtener_articulos_ecommerce_web(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      fetchLimit,
                      fetchOffset,
                      f.marca,
                      f.categoria,
                      f.proveedor,
                      f.precioMin,
                      f.precioMax,
                      f.soloStock,
                      f.busqueda,
                    ],
                  )
                  .then((r) => r[0] || []);

          const rows = await this.productsUtils.enrichProductRows(
            productos,
            this.productsImagesReadRepository,
          );

          if (!soloConImagenes) {
            const totalRows = await this.contarProductos(filters, WEB_BASE_WHERE);
            return { data: rows as any[], total: totalRows };
          }

          const conImagenes = rows.filter(
            (p: any) => Array.isArray(p.imagenes) && p.imagenes.length > 0,
          );
          return {
            data: conImagenes.slice(offset, offset + limit) as any[],
            total: conImagenes.length,
          };
        })(),
        15000,
        'productsList',
      );
      dataConCuotas = result.data;
      total = result.total;
      await this.cache.set(staleKey, result, this.STALE_TTL);
    } catch (e) {
      const stale = await this.cache.get<{ data: any[]; total: number }>(staleKey);
      if (stale) {
        this.logger.warn(
          `fetchAndCachePrismaProductos: fallo (${(e as Error)?.message}), sirviendo stale-cache para esta búsqueda`,
        );
        return stale;
      }
      throw e;
    }

    await this.cache.set(
      cacheKey,
      { data: dataConCuotas as any[], total },
      this.CACHE_TTL,
    );

    return { data: dataConCuotas as any[], total };
  }

  async contarProductos(filters: any = {}, WEB_BASE_WHERE: string): Promise<number> {
    const f = this.productsUtils.buildProcFilters(filters);
    const busquedaCond = this.productsUtils.buildBusquedaSql(f.busqueda);
    const depositoIds = await this.resilience.getStockDepositoIds();

    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
         ${this.resilience.stockJoinSql(depositoIds)}
        WHERE ${WEB_BASE_WHERE}
          AND a.precioventa >= 9000
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND ${busquedaCond.sql}`,
      [
        f.marca,
        f.marca,
        f.categoria,
        f.categoria,
        f.proveedor,
        f.proveedor,
        f.precioMin,
        f.precioMin,
        f.precioMax,
        f.precioMax,
        ...busquedaCond.params,
      ],
    );
    return Number(rows?.[0]?.total || 0);
  }
}
