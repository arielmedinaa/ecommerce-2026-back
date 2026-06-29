import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import {
  ResilientService,
  ResilientOptions,
} from '@shared/common/decorators/resilient-client.decorator';
import { Repository, In } from 'typeorm';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
import { Product } from '../schemas/product.schemas';
import { Combo } from '../schemas/combo.schemas';
import { ProductsImage } from '../schemas/products-image.schema';
import { ProductsImagesService } from './products-images.service';

import { ProductsUtils } from '@products/utils/utils-products';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
//import { Promo } from '../schemas/promo.schemas';

interface CartResponse {
  data: any[];
  success: boolean;
  message: string;
  total: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product, 'WRITE_CONNECTION')
    private readonly productWriteRepository: Repository<Product>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    @InjectRepository(Combo, 'WRITE_CONNECTION')
    private readonly comboWriteRepository: Repository<Combo>,
    @InjectRepository(Combo, 'READ_CONNECTION')
    private readonly comboReadRepository: Repository<Combo>,
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    private readonly promosService: PromosService,
    private readonly productsUtils: ProductsUtils,
    private readonly productsImagesService: ProductsImagesService,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly resilientService: ResilientService,
    private readonly cache: CachePersistenteService,
  ) {}

  // Cachés ahora en Redis (vía CachePersistenteService) para que el servicio sea
  // stateless y escale horizontalmente. Las claves se namespacean por dominio.
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly PRODUCT_CACHE_TTL = 10 * 60 * 1000;

  // Definición "óptimo para web" — debe espejar EXACTAMENTE las condiciones de
  // proc_obtener_articulos_ecommerce_web para que el total/stats/facets coincidan
  // con el listado (el proc SIEMPRE exige stock>0 en depósitos válidos).
  private readonly WEB_BASE_WHERE = `a.baja = 0 AND (a.websc = 1 OR a.web = 1)`;
  private readonly STOCK_EXISTS = `EXISTS (
    SELECT 1 FROM tbl_stock_actual sa
      JOIN deposito d ON d.codigo = sa.deposito
     WHERE sa.codigo_articulo = a.codigo_articulo
       AND d.habilitado_reserva = 1 AND d.codigo <> 33
       AND sa.cantidad_actual > 0)`;

  private getCacheKey(filters: any): string {
    return JSON.stringify({
      limit: filters.limit,
      offset: filters.offset,
      categoria: filters.categoria,
      subcategoria: filters.subcategoria,
      proveedor: filters.proveedor,
      precioMin: filters.precioMin,
      precioMax: filters.precioMax,
      soloConStock: filters.soloConStock,
      search: filters.search,
      busqueda: filters.busqueda,
      nombre: filters.nombre,
      marca: filters.marca,
    });
  }

  /** Normaliza los filtros del listado a los 7 parámetros opcionales del proc v2. */
  private buildProcFilters(filters: any = {}) {
    const num = (v: any): number | null => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const soloStock =
      filters.soloConStock === true ||
      filters.soloConStock === 1 ||
      filters.soloConStock === '1' ||
      filters.soloConStock === 'true';
    return {
      marca: this.normFiltro(filters.marca),
      categoria: this.normFiltro(filters.categoria),
      proveedor: this.normFiltro(filters.proveedor),
      precioMin: num(filters.precioMin),
      precioMax: num(filters.precioMax),
      soloStock: soloStock ? 1 : null,
      busqueda: this.normFiltro(filters.busqueda ?? filters.search),
    };
  }

  invalidateCache(): void {
    void this.cache.delByPrefix('products:');
  }

  /**
   * Enriquece las filas de un proc (web o v2) con imágenes activas, trim de campos
   * y cálculo de cuotas. Ambos procs devuelven las mismas columnas, así que comparten
   * este post-procesamiento.
   */
  private async enrichProductRows(productos: any[]): Promise<any[]> {
    const codigosProductos = productos.map((item: any) =>
      item.codigo_articulo.trim(),
    );
    const imagenesMap = new Map();
    if (codigosProductos.length > 0) {
      const imagenes = await this.productsImagesReadRepository
        .createQueryBuilder('img')
        .where('img.producto_codigo IN (:...codigos)', {
          codigos: codigosProductos,
        })
        .andWhere('img.activo = :activo', { activo: true })
        .orderBy('img.orden', 'ASC')
        .getMany();

      imagenes.forEach((img) => {
        if (!imagenesMap.has(img.producto_codigo)) {
          imagenesMap.set(img.producto_codigo, []);
        }
        imagenesMap.get(img.producto_codigo).push(img.url_imagen);
      });
    }

    const dataWithTrimmedNames = productos.map((item: any) => ({
      ...item,
      codigo_articulo: item.codigo_articulo.trim(),
      nombre_articulo: item.nombre_articulo.trim(),
      nombre_subcategoria: item.nombre_subcategoria.trim(),
      nombre_marca: item.nombre_marca.trim(),
      nombre_proveedor: item.nombre_proveedor.trim(),
      codigo_de_barra: item.codigo_de_barra.trim(),
      descripcion: item.nota.trim(),
      imagenes: imagenesMap.get(item.codigo_articulo.trim()) || [],
    }));

    return this.productsUtils.calculoCreditoProductos(dataWithTrimmedNames || []);
  }

  /**
   * Catálogo COMPLETO (proc v2): ~41k artículos habilitados para web, con stock
   * OPCIONAL. Pensado para el panel "Analizar Artículos" del admin — paginado y
   * buscable server-side (NUNCA traer los 41k de una; el proc con limit 0 tarda ~15s).
   */
  async getCatalogoV2(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:v2:${this.getCacheKey(filters)}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) return cached;

    const limit = Number(filters.limit) || 50;
    const offset = Number(filters.offset) || 0;
    const f = this.buildProcFilters(filters);
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce_v2(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [limit, offset, f.marca, f.categoria, f.proveedor, f.precioMin, f.precioMax, f.soloStock, f.busqueda],
    );

    const dataConCuotas = await this.enrichProductRows(result[0] || []);
    const total = await this.contarProductosV2(filters);

    const payload = { data: dataConCuotas as any[], total };
    await this.cache.set(cacheKey, payload, this.CACHE_TTL);
    return payload;
  }

  /**
   * Conteo para el catálogo v2: base web (baja=0, web/websc=1) + filtros, con stock
   * OPCIONAL (solo lo exige si el filtro soloConStock está activo). COUNT liviano,
   * sin tmp tables, para que la paginación de los 41k sea barata.
   */
  private async contarProductosV2(filters: any = {}): Promise<number> {
    const f = this.buildProcFilters(filters);
    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
        WHERE ${this.WEB_BASE_WHERE}
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND (? IS NULL
               OR TRIM(a.codigo) = ?
               OR a.codigodebarra = ?
               OR a.nombre LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%'))
          AND (? IS NULL OR ? = 0 OR ${this.STOCK_EXISTS})`,
      [
        f.marca, f.marca,
        f.categoria, f.categoria,
        f.proveedor, f.proveedor,
        f.precioMin, f.precioMin,
        f.precioMax, f.precioMax,
        f.busqueda, f.busqueda, f.busqueda, f.busqueda,
        f.soloStock, f.soloStock,
      ],
    );
    return Number(rows?.[0]?.total || 0);
  }

  private async getCachedPrismaProductos(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:list:${this.getCacheKey(filters)}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) {
      return { data: cached.data, total: cached.total };
    }

    const limit = Number(filters.limit) || 0;
    const offset = Number(filters.offset) || 0;
    const f = this.buildProcFilters(filters);
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_articulos_ecommerce_web(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [limit, offset, f.marca, f.categoria, f.proveedor, f.precioMin, f.precioMax, f.soloStock, f.busqueda],
    );

    const productos = result[0] || [];
    const dataConCuotas = await this.enrichProductRows(productos);
    const total = await this.contarProductos(filters);

    await this.cache.set(
      cacheKey,
      { data: dataConCuotas as any[], total },
      this.CACHE_TTL,
    );

    return { data: dataConCuotas as any[], total };
  }

  private normFiltro(value: any): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
  }

  private async contarProductos(filters: any = {}): Promise<number> {
    const f = this.buildProcFilters(filters);
    // Mismas condiciones que proc_obtener_articulos_ecommerce_web: el stock>0 es
    // OBLIGATORIO siempre (el proc ignora p_solo_con_stock), por eso el total coincide
    // con las filas que devuelve el listado (~1524 sin filtros).
    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
        WHERE ${this.WEB_BASE_WHERE}
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND (? IS NULL
               OR TRIM(a.codigo) = ?
               OR a.codigodebarra = ?
               OR a.nombre LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%'))
          AND ${this.STOCK_EXISTS}`,
      [
        f.marca, f.marca,
        f.categoria, f.categoria,
        f.proveedor, f.proveedor,
        f.precioMin, f.precioMin,
        f.precioMax, f.precioMax,
        f.busqueda, f.busqueda, f.busqueda, f.busqueda,
      ],
    );
    return Number(rows?.[0]?.total || 0);
  }

  async getFacets(): Promise<any> {
    const cached = await this.cache.get('products:facets');
    if (cached) return cached;
    // Facetas sobre el mismo conjunto óptimo-web (con stock) que muestra el listado.
    const baseWhere = `${this.WEB_BASE_WHERE} AND ${this.STOCK_EXISTS}`;
    const [categorias, marcas, proveedores, precio] = await Promise.all([
      this.productReadRepository.query(
        `SELECT a.familia AS codigo, f.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN familia f ON f.codigo = a.familia
          WHERE ${baseWhere} GROUP BY a.familia, f.nombre ORDER BY f.nombre`,
      ),
      this.productReadRepository.query(
        `SELECT a.marca AS codigo, m.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN marca m ON m.codigo = a.marca
          WHERE ${baseWhere} GROUP BY a.marca, m.nombre ORDER BY total DESC`,
      ),
      this.productReadRepository.query(
        `SELECT a.proveedor AS codigo, pv.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN proveedor pv ON pv.codigo = a.proveedor
          WHERE ${baseWhere} GROUP BY a.proveedor, pv.nombre ORDER BY pv.nombre`,
      ),
      this.productReadRepository.query(
        `SELECT MIN(NULLIF(a.precioventa, 0)) AS min, MAX(a.precioventa) AS max
           FROM articulo a WHERE ${baseWhere} AND a.precioventa > 0`,
      ),
    ]);
    const norm = (arr: any[]) =>
      (arr || []).map((r) => ({
        codigo: String(r.codigo),
        nombre: String(r.nombre || '').trim(),
        total: Number(r.total),
      }));
    const data = {
      categorias: norm(categorias),
      marcas: norm(marcas),
      proveedores: norm(proveedores),
      precio: {
        min: Number(precio?.[0]?.min || 0),
        max: Number(precio?.[0]?.max || 0),
      },
    };
    await this.cache.set('products:facets', data, this.CACHE_TTL);
    return data;
  }

  async getStats(): Promise<any> {
    const cached = await this.cache.get('products:stats');
    if (cached) return cached;
    const [base, stock, webEnabled] = await Promise.all([
      // Conjunto óptimo-web (con stock>0): coincide con el listado (~1524).
      this.productReadRepository.query(
        `SELECT COUNT(*) AS total_web, SUM(a.web = 1) AS activos,
                COUNT(DISTINCT a.familia) AS categorias_totales,
                COUNT(DISTINCT a.subfamilia) AS subcategorias_totales
           FROM articulo a WHERE ${this.WEB_BASE_WHERE} AND ${this.STOCK_EXISTS}`,
      ),
      this.productReadRepository.query(
        `SELECT SUM(st > 0 AND st <= 5) AS stock_critico
           FROM (
            SELECT sa.codigo_articulo, SUM(sa.cantidad_actual) AS st
              FROM tbl_stock_actual sa
              JOIN deposito d ON d.codigo = sa.deposito
              JOIN articulo a ON a.codigo_articulo = sa.codigo_articulo
             WHERE d.habilitado_reserva = 1 AND d.codigo <> 33 AND ${this.WEB_BASE_WHERE}
             GROUP BY sa.codigo_articulo
          ) t`,
      ),
      // Todos los habilitados para web (con o sin stock) → para derivar sin_stock.
      this.productReadRepository.query(
        `SELECT COUNT(*) AS web_total FROM articulo a WHERE ${this.WEB_BASE_WHERE}`,
      ),
    ]);
    const totalWeb = Number(base?.[0]?.total_web || 0);
    const webTotal = Number(webEnabled?.[0]?.web_total || 0);
    const data = {
      total_web: totalWeb,
      activos: Number(base?.[0]?.activos || 0),
      categorias_totales: Number(base?.[0]?.categorias_totales || 0),
      subcategorias_totales: Number(base?.[0]?.subcategorias_totales || 0),
      con_stock: totalWeb,
      sin_stock: Math.max(0, webTotal - totalWeb),
      stock_critico: Number(stock?.[0]?.stock_critico || 0),
    };
    await this.cache.set('products:stats', data, this.CACHE_TTL);
    return data;
  }

  async findAll(filters: any = {}): Promise<{ data: any[]; total: number }> {
    // La búsqueda (nombre/código/código de barra) ahora la resuelve el proc vía
    // p_busqueda → paginación y total reales sobre todo el catálogo (sin filtrado en memoria).
    return this.getCachedPrismaProductos(filters);
  }

  /**
   * Sugerencias de búsqueda para el buscador del storefront (autocomplete).
   * Reutiliza la búsqueda real del catálogo y deriva, data-driven:
   *  - productos: top N coincidencias por nombre (autocomplete) → {codigo, nombre, precio, imagen}
   *  - terminos:  refinamientos (subcategoría + marca) más frecuentes entre las coincidencias,
   *               para ofrecer chips "+ término" (búsqueda multi-término).
   * No hay cross-sell semántico real (no existen datos de co-compra/complementos): eso es Fase 2.
   */
  async getSuggestions(
    q: string,
    limit = 6,
  ): Promise<{ data: { productos: any[]; terminos: string[] }; success: boolean; message: string }> {
    const termino = this.normFiltro(q);
    if (!termino) {
      return { data: { productos: [], terminos: [] }, success: true, message: 'SIN TÉRMINO' };
    }

    const { data } = await this.findAll({ search: termino, limit: 15, offset: 0, soloConStock: true });
    const rows = Array.isArray(data) ? data : [];

    const productos = rows.slice(0, limit).map((p: any) => ({
      codigo: p.codigo_articulo,
      nombre: p.nombre_articulo,
      precio: p.precio ?? p.precioventa ?? p.precio_venta ?? null,
      imagen: Array.isArray(p.imagenes) ? p.imagenes[0] ?? null : null,
    }));

    // Refinamientos: subcategorías + marcas distintas, rankeadas por frecuencia.
    const qLower = termino.toLowerCase();
    const freq = new Map<string, number>();
    for (const p of rows) {
      for (const t of [p.nombre_subcategoria, p.nombre_marca]) {
        const val = String(t || '').trim();
        if (!val) continue;
        if (val.toLowerCase() === qLower) continue;
        freq.set(val, (freq.get(val) || 0) + 1);
      }
    }
    const terminos = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);

    return { data: { productos, terminos }, success: true, message: 'SUGERENCIAS' };
  }

  async prefetchfindAll(
    filters: any = {},
  ): Promise<{
    data: { carritos: any[]; promociones: any[] };
    message: string;
    success: boolean;
    total: number;
  }> {
    try {
      const products = await this.productReadRepository.query(
        'SELECT * FROM articulo WHERE codigo_articulo = ?',
        [filters.codigo],
      );
      let promocionesPorProductosId = await this.productReadRepository.query(
        'CALL proc_promos_por_articulo(?, ?)',
        [filters.codigo, true],
      );

      const carritosProductosId = [];
      const productosRelacionados = [];
      const resilientOptions: ResilientOptions = {
        retries: 3,
        delay: 1000,
        fallback: async () => {
          this.logger.warn('Using fallback cart data');
          return {
            data: [],
            total: 0,
            message: 'Fallback cart data',
            success: false,
          };
        },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 30000,
        },
      };

      for (const product of products) {
        if (product.codigo_articulo) {
          try {
            const cartResponse =
              (await this.resilientService.sendWithResilience(
                this.cartClient as any,
                { cmd: 'get_missing_cart_by_product' },
                {
                  limit: 10,
                  skip: 0,
                  sort: 'createdAt',
                  order: 'DESC',
                  codigo: product.codigo_articulo,
                },
                resilientOptions,
              )) as CartResponse;

            if (
              cartResponse &&
              cartResponse.success &&
              cartResponse.data.length > 0
            ) {
              carritosProductosId.push({
                productoCodigo: product.codigo_articulo,
                carritos: cartResponse.data,
                total: cartResponse.total,
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch cart data for product ${product.codigo_articulo}:`,
              error,
            );
            return {
              data: { carritos: [], promociones: [] },
              message: 'Error prefetching products and cart data',
              success: false,
              total: 0,
            };
          }
        }
      }

      return {
        data: {
          carritos: carritosProductosId.map((item) => item.carritos).flat(),
          promociones: promocionesPorProductosId[0],
        },
        message: `Prefetching completed for ${products.length} products`,
        success: true,
        total: carritosProductosId.length,
      };
    } catch (error) {
      this.logger.error('Error in prefetchfindAll:', error);
      return {
        data: { carritos: [], promociones: [] },
        message: 'Error prefetching products and cart data',
        success: false,
        total: 0,
      };
    }
  }

  async create(createPrismaProductDto: CreateProductDto): Promise<any> {  
    const data: any = { ...createPrismaProductDto };
    if (typeof data.web === 'number') {
      data.web = data.web === 1;
    }

    const createdPrismaProduct = await this.productWriteRepository.save({
      ...data,
    });
    this.invalidateCache();
    return createdPrismaProduct;
  }

  async createCombo(createCombo: CreateComboDto): Promise<any> {
    const createdCombo = await this.comboWriteRepository.save({
      ...createCombo,
      ruta: 'combo-default-route',
      descripcion: createCombo.descripcion || 'Combo description',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return createdCombo;
  }

  async update(
    id: string,
    updatePrismaProductDto: CreateProductDto,
  ): Promise<any> {
    try {
      const data: any = { ...updatePrismaProductDto };
      if (typeof data.web === 'number') {
        data.web = data.web === 1;
      }

      const updatedPrismaProduct = await this.productWriteRepository.update(
        id as any,
        data,
      );

      this.invalidateCache();
      return updatedPrismaProduct;
    } catch (error) {
      throw new NotFoundException(`PrismaProducto con ID ${id} no encontrado`);
    }
  }

  async findManyByIds(ids: string[], fields?: string, filters: any = {}) {
    if (!ids || ids.length === 0) return [];

    let select: any = {
      codigo: true,
    };

    if (fields) {
      const fieldList = fields.split(',').map((f) => f.trim());
      fieldList.forEach((field) => {
        select[field] = true;
      });
    }

    const productosEnCache: any[] = [];
    const codigosFaltantes: string[] = [];

    // Lecturas de caché en paralelo (una clave Redis por código).
    const cacheHits = await Promise.all(
      ids.map((codigo) => this.cache.get<any>(`products:codigo:${codigo}`)),
    );
    ids.forEach((codigo, i) => {
      const hit = cacheHits[i];
      if (hit) productosEnCache.push(hit);
      else codigosFaltantes.push(codigo);
    });

    let productosDB: any[] = [];
    if (codigosFaltantes.length > 0) {
      productosDB = await this.productReadRepository.find({
        where: {
          codigo: In(codigosFaltantes),
        },
        select,
        order: { codigo_articulo: 'asc' },
      });

      await Promise.all(
        productosDB.map((prod) =>
          prod && prod.codigo
            ? this.cache.set(
                `products:codigo:${prod.codigo}`,
                prod,
                this.PRODUCT_CACHE_TTL,
              )
            : Promise.resolve(),
        ),
      );
    }

    const productosPorCodigo: Record<string, any> = {};
    [...productosEnCache, ...productosDB].forEach((prod) => {
      if (prod && prod.codigo) productosPorCodigo[prod.codigo] = prod;
    });

    const productosFinal = ids
      .map((codigo) => productosPorCodigo[codigo])
      .filter(Boolean);
    const offset = Number(filters.offset) || 0;
    const limit = Number(filters.limit) || productosFinal.length;
    return productosFinal.slice(offset, offset + limit);
  }

  async getProductsByCodigos(
    codigos: string[],
    limit = 24,
  ): Promise<{ data: any[]; total: number }> {
    if (!Array.isArray(codigos) || codigos.length === 0) {
      return { data: [], total: 0 };
    }
    const lista = [
      ...new Set(codigos.map((c) => String(c).trim()).filter(Boolean)),
    ].slice(0, 200);
    if (lista.length === 0) return { data: [], total: 0 };

    const productos = await this.productReadRepository.find({
      where: { codigo_articulo: In(lista) },
    });

    const imagenesMap = new Map<string, string[]>();
    if (productos.length > 0) {
      const cods = productos.map((p) => String(p.codigo_articulo).trim());
      const imagenes = await this.productsImagesReadRepository
        .createQueryBuilder('img')
        .where('img.producto_codigo IN (:...codigos)', { codigos: cods })
        .andWhere('img.activo = :activo', { activo: true })
        .orderBy('img.orden', 'ASC')
        .getMany();
      imagenes.forEach((img) => {
        if (!imagenesMap.has(img.producto_codigo)) {
          imagenesMap.set(img.producto_codigo, []);
        }
        imagenesMap.get(img.producto_codigo).push(img.url_imagen);
      });
    }

    const enriquecidos = productos.map((p: any) => {
      const cod = String(p.codigo_articulo).trim();
      return {
        ...p,
        codigo_articulo: cod,
        nombre_articulo: String(p.nombre ?? '').trim(),
        imagenes: imagenesMap.get(cod) || [],
      };
    });

    // Respeta el orden recibido (orden de la promo / del editor).
    const byCod = new Map(enriquecidos.map((d) => [d.codigo_articulo, d]));
    const ordered = lista.map((c) => byCod.get(c)).filter(Boolean);

    const dataConCuotas =
      await this.productsUtils.calculoCreditoProductos(ordered);
    const lim = Number(limit) || dataConCuotas.length;
    return { data: dataConCuotas.slice(0, lim), total: dataConCuotas.length };
  }

  async findManyByPromos(filters: any = {}) {
    const promos = await this.promosService.findAll(filters);
    const codigos: string[] = promos
      .flatMap((promo: any) =>
        Array.isArray(promo.contenido?.producto)
          ? promo.contenido.producto.map((p: any) => p.codigo)
          : [],
      )
      .filter((codigo) => !!codigo);

    return this.findManyByIds(codigos, filters.fields, filters);
  }

  async getProductsJota(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:jota:${this.getCacheKey({ ...filters, type: 'jota' })}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) {
      return { data: cached.data, total: cached.total };
    }
    const limit = Number(filters.limit) || 0;
    const offset = Number(filters.offset) || 0;
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce(?, ?, 257, NULL)',
      [limit, offset],
    );

    const productos = result[0] || [];
    const codigosProductos = productos.map((item: any) =>
      item.codigo_articulo.trim(),
    );
    const imagenesMap = new Map();
    if (codigosProductos.length > 0) {
      const imagenes = await this.productsImagesReadRepository
        .createQueryBuilder('img')
        .where('img.producto_codigo IN (:...codigos)', {
          codigos: codigosProductos,
        })
        .andWhere('img.activo = :activo', { activo: true })
        .orderBy('img.orden', 'ASC')
        .getMany();

      imagenes.forEach((img) => {
        if (!imagenesMap.has(img.producto_codigo)) {
          imagenesMap.set(img.producto_codigo, []);
        }
        imagenesMap.get(img.producto_codigo).push(img.url_imagen);
      });
    }

    const dataWithTrimmedNames = productos.map((item: any) => ({
      ...item,
      codigo_articulo: item.codigo_articulo.trim(),
      nombre_articulo: item.nombre_articulo.trim(),
      nombre_subcategoria: item.nombre_subcategoria.trim(),
      nombre_marca: item.nombre_marca.trim(),
      nombre_proveedor: item.nombre_proveedor.trim(),
      codigo_de_barra: item.codigo_de_barra.trim(),
      descripcion: item.nota.trim(),
      imagenes: imagenesMap.get(item.codigo_articulo.trim()) || [],
    }));

    const data = dataWithTrimmedNames || [];
    const dataConCuotas =
      await this.productsUtils.calculoCreditoProductos(data);
    const total = result[1]?.[0]?.total_registros || dataConCuotas.length;

    await this.cache.set(
      cacheKey,
      { data: dataConCuotas as any[], total },
      this.CACHE_TTL,
    );

    return { data: dataConCuotas as any[], total };
  }
}
