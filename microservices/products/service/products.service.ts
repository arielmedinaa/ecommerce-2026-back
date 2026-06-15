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
  ) {}

  private productosCache = new Map<
    string,
    { data: any[]; total: number; timestamp: number }
  >();
  private productoPorCodigoCache = new Map<
    string,
    { data: any; timestamp: number }
  >();
  private productosJotaCache = new Map<
    string,
    { data: any[]; total: number; timestamp: number }
  >();
  private facetsCache: { data: any; timestamp: number } | null = null;
  private statsCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE_ENTRIES = 100;
  private readonly PRODUCT_CACHE_TTL = 10 * 60 * 1000;

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
    this.productosCache.clear();
    this.productoPorCodigoCache.clear();
    this.productosJotaCache.clear();
    this.facetsCache = null;
    this.statsCache = null;
  }

  private async getCachedPrismaProductos(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = this.getCacheKey(filters);
    const now = Date.now();
    const cached = this.productosCache.get(cacheKey);
    if (cached && now - cached.timestamp <= this.CACHE_TTL) {
      return { data: cached.data, total: cached.total };
    }

    const limit = Number(filters.limit) || 0;
    const offset = Number(filters.offset) || 0;
    const f = this.buildProcFilters(filters);
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce_v2(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [limit, offset, f.marca, f.categoria, f.proveedor, f.precioMin, f.precioMax, f.soloStock, f.busqueda],
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
    const total = await this.contarProductos(filters);

    if (this.productosCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.productosCache.keys().next().value;
      this.productosCache.delete(oldestKey);
    }

    this.productosCache.set(cacheKey, {
      data: dataConCuotas as any[],
      total,
      timestamp: now,
    });

    return { data: dataConCuotas as any[], total };
  }

  private normFiltro(value: any): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
  }

  private async contarProductos(filters: any = {}): Promise<number> {
    const f = this.buildProcFilters(filters);
    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
        WHERE a.baja = 0 AND (a.websc = 1 OR a.web = 1)
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND (? IS NULL
               OR TRIM(a.codigo) = ?
               OR a.codigodebarra = ?
               OR a.nombre LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%'))
          AND (? IS NULL OR ? = 0
               OR EXISTS (SELECT 1 FROM tbl_stock_actual sa
                          JOIN deposito d ON d.codigo = sa.deposito
                          WHERE sa.codigo_articulo = a.codigo_articulo
                            AND d.habilitado_reserva = 1 AND d.codigo <> 33
                            AND sa.cantidad_actual > 0))`,
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

  /** Facetas para los filtros del admin (categorías, marcas, proveedores, rango de precio). Cacheado. */
  async getFacets(): Promise<any> {
    const now = Date.now();
    if (this.facetsCache && now - this.facetsCache.timestamp <= this.CACHE_TTL) {
      return this.facetsCache.data;
    }
    const baseWhere = `a.baja = 0 AND (a.websc = 1 OR a.web = 1)`;
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
    this.facetsCache = { data, timestamp: now };
    return data;
  }

  async getStats(): Promise<any> {
    const now = Date.now();
    if (this.statsCache && now - this.statsCache.timestamp <= this.CACHE_TTL) {
      return this.statsCache.data;
    }
    const baseWhere = `a.baja = 0 AND (a.websc = 1 OR a.web = 1)`;
    const [base, stock] = await Promise.all([
      this.productReadRepository.query(
        `SELECT COUNT(*) AS total_web, SUM(a.web = 1) AS activos,
                COUNT(DISTINCT a.familia) AS categorias_totales,
                COUNT(DISTINCT a.subfamilia) AS subcategorias_totales
           FROM articulo a WHERE ${baseWhere}`,
      ),
      this.productReadRepository.query(
        `SELECT SUM(st > 0) AS con_stock,
                SUM(st > 0 AND st <= 5) AS stock_critico
           FROM (
            SELECT sa.codigo_articulo, SUM(sa.cantidad_actual) AS st
              FROM tbl_stock_actual sa
              JOIN deposito d ON d.codigo = sa.deposito
              JOIN articulo a ON a.codigo_articulo = sa.codigo_articulo
             WHERE d.habilitado_reserva = 1 AND d.codigo <> 33 AND ${baseWhere}
             GROUP BY sa.codigo_articulo
          ) t`,
      ),
    ]);
    const totalWeb = Number(base?.[0]?.total_web || 0);
    const conStock = Number(stock?.[0]?.con_stock || 0);
    const data = {
      total_web: totalWeb,
      activos: Number(base?.[0]?.activos || 0),
      categorias_totales: Number(base?.[0]?.categorias_totales || 0),
      subcategorias_totales: Number(base?.[0]?.subcategorias_totales || 0),
      con_stock: conStock,
      sin_stock: Math.max(0, totalWeb - conStock),
      stock_critico: Number(stock?.[0]?.stock_critico || 0),
    };
    this.statsCache = { data, timestamp: now };
    return data;
  }

  async findAll(filters: any = {}): Promise<{ data: any[]; total: number }> {
    // La búsqueda (nombre/código/código de barra) ahora la resuelve el proc vía
    // p_busqueda → paginación y total reales sobre todo el catálogo (sin filtrado en memoria).
    return this.getCachedPrismaProductos(filters);
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
    const now = Date.now();

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

    for (const codigo of ids) {
      const cached = this.productoPorCodigoCache.get(codigo);
      if (cached && now - cached.timestamp <= this.PRODUCT_CACHE_TTL) {
        productosEnCache.push(cached.data);
      } else {
        codigosFaltantes.push(codigo);
      }
    }

    let productosDB: any[] = [];
    if (codigosFaltantes.length > 0) {
      productosDB = await this.productReadRepository.find({
        where: {
          codigo: In(codigosFaltantes),
        },
        select,
        order: { codigo_articulo: 'asc' },
      });

      for (const prod of productosDB) {
        if (prod && prod.codigo) {
          this.productoPorCodigoCache.set(prod.codigo, {
            data: prod,
            timestamp: now,
          });
        }
      }
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

  // Trae productos por una lista de codigos (codigo_articulo) y los enriquece con
  // imagenes + cuotas, igual que el listado principal, para el carrusel de landings.
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

  async findManyComboByCodigo(codigo: string) {
    const where: any = {
      codigo,
      estado: 1,
      precio: { gt: 9000 },
      web: 1,
      AND: [
        {
          OR: [
            { cantidad: { gt: 0 }, dias_ultimo_movimiento: { lte: 30 } },
            { cantidad: 0, dias_ultimo_movimiento: { lt: 30 } },
          ],
        },
      ],
    };

    return this.comboReadRepository.findOne({ where });
  }

  async getProductsJota(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = this.getCacheKey({ ...filters, type: 'jota' });
    const now = Date.now();
    const cached = this.productosJotaCache.get(cacheKey);
    if (cached && now - cached.timestamp <= this.CACHE_TTL) {
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

    if (this.productosJotaCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.productosJotaCache.keys().next().value;
      this.productosJotaCache.delete(oldestKey);
    }

    this.productosJotaCache.set(cacheKey, {
      data: dataConCuotas as any[],
      total,
      timestamp: now,
    });

    return { data: dataConCuotas as any[], total };
  }
}
