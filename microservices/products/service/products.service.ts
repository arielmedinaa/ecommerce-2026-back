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
import { SearchTerm } from '../schemas/search-term.schema';
import {
  complementosPara,
  complementosNiveles,
  type ComplementoNiveles,
} from '../utils/complementos';
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
    @InjectRepository(SearchTerm, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly searchTermWrite: Repository<SearchTerm>,
    @InjectRepository(SearchTerm, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly searchTermRead: Repository<SearchTerm>,
  ) {}

  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly PRODUCT_CACHE_TTL = 10 * 60 * 1000;
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
      busqueda: this.normBusqueda(filters.busqueda ?? filters.search),
    };
  }

  invalidateCache(): void {
    void this.cache.delByPrefix('products:');
  }

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

    return this.productsUtils.calculoCreditoProductos(
      dataWithTrimmedNames || [],
    );
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
    const cached = await this.cache.get<{ data: any[]; total: number }>(
      cacheKey,
    );
    if (cached) return cached;

    const limit = Number(filters.limit) || 50;
    const offset = Number(filters.offset) || 0;
    const f = this.buildProcFilters(filters);
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce_v2(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        limit,
        offset,
        f.marca,
        f.categoria,
        f.proveedor,
        f.precioMin,
        f.precioMax,
        f.soloStock,
        f.busqueda,
      ],
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
        f.busqueda,
        f.busqueda,
        f.busqueda,
        f.busqueda,
        f.soloStock,
        f.soloStock,
      ],
    );
    return Number(rows?.[0]?.total || 0);
  }

  private async getCachedPrismaProductos(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:list:${this.getCacheKey(filters)}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(
      cacheKey,
    );
    if (cached) {
      return { data: cached.data, total: cached.total };
    }

    const limit = Number(filters.limit) || 0;
    const offset = Number(filters.offset) || 0;
    const f = this.buildProcFilters(filters);
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_articulos_ecommerce_web(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        limit,
        offset,
        f.marca,
        f.categoria,
        f.proveedor,
        f.precioMin,
        f.precioMax,
        f.soloStock,
        f.busqueda,
      ],
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

  // Normaliza el término de búsqueda a su forma singular (español) por token, para
  // que "celulares" matchee productos cuyo nombre dice "celular". Conservador: no
  // toca palabras cortas y solo aplica reglas de plural comunes (-es / -s).
  private normBusqueda(value: any): string | null {
    const s = this.normFiltro(value);
    if (!s) return s;
    const singular = s
      .split(/\s+/)
      .map((tok) => this.singularizarToken(tok))
      .join(' ')
      .trim();
    return singular === '' ? null : singular;
  }

  private singularizarToken(tok: string): string {
    if (tok.length <= 4) return tok; // "gas", "mes", "web"... no tocar
    // Consonante + "es" → quitar "es": celulares→celular, televisores→televisor.
    if (/[bcdfghjklmnpqrstvwxyz]es$/i.test(tok)) {
      const base = tok.slice(0, -2);
      if (base.length >= 4) return base;
    }
    // Vocal + "s" → quitar "s": fundas→funda, zapatillas→zapatilla, mesas→mesa.
    if (/[aeiou]s$/i.test(tok)) return tok.slice(0, -1);
    return tok;
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
        f.busqueda,
        f.busqueda,
        f.busqueda,
        f.busqueda,
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
    const res = await this.getCachedPrismaProductos(filters);
    return this.aplicarPrioridadJota(res, filters);
  }

  // Familias donde JOTA (marca 257) es prioritaria: 4 Refrigeración, 5 Climatización,
  // 6 Cocinas y anafes, 7 Lavado.
  private static readonly JOTA_MARCA = 257;
  private static readonly JOTA_FAMILIAS = new Set([4, 5, 6, 7]);
  private static readonly JOTA_KEYWORDS =
    /(cocina|anafe|heladera|refriger|freezer|climatiz|aire|lavarrop|lavado|lavasecarropas)/i;

  private esJotaRow(r: any): boolean {
    return (
      Number(r?.codigo_marca) === ProductsService.JOTA_MARCA ||
      /jota/i.test(String(r?.nombre_marca ?? ''))
    );
  }

  // ¿La consulta apunta a familias JOTA? (por categoria, keyword de búsqueda, o porque
  // la mayoría de las filas pertenecen a esas familias).
  private esConsultaJota(rows: any[], filters: any = {}): boolean {
    const categoria = Number(filters?.categoria);
    if (Number.isFinite(categoria) && ProductsService.JOTA_FAMILIAS.has(categoria)) return true;
    const search = String(filters?.search ?? '').trim();
    if (search && ProductsService.JOTA_KEYWORDS.test(search)) return true;
    if (Array.isArray(rows) && rows.length) {
      const enFam = rows.filter((r) =>
        ProductsService.JOTA_FAMILIAS.has(Number(r?.codigo_categoria)),
      );
      if (enFam.length * 2 >= rows.length) return true;
    }
    return false;
  }

  // Hace que JOTA lidere el listado en familias JOTA: en la primera página (offset 0)
  // trae los artículos JOTA de la misma consulta y los antepone (dedup); en páginas
  // siguientes solo reordena los JOTA ya presentes. No aplica si el usuario filtró por
  // otra marca.
  private async aplicarPrioridadJota(
    res: { data: any[]; total: number },
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const rows = Array.isArray(res.data) ? res.data : [];
    const marcaFiltro = this.normFiltro(filters?.marca);
    if (marcaFiltro || rows.length === 0) return res;
    if (!this.esConsultaJota(rows, filters)) return res;

    const offset = Number(filters?.offset) || 0;
    const limit = Number(filters?.limit) || rows.length;

    const dedupPrepend = (jota: any[], resto: any[]) => {
      const cods = new Set(jota.map((r) => String(r?.codigo_articulo)));
      return [...jota, ...resto.filter((r) => !cods.has(String(r?.codigo_articulo)))];
    };

    if (offset > 0) {
      const jota = rows.filter((r) => this.esJotaRow(r));
      if (!jota.length || jota.length === rows.length) return res;
      return {
        ...res,
        data: dedupPrepend(jota, rows.filter((r) => !this.esJotaRow(r))),
      };
    }

    // Página 0: traer JOTA de la misma consulta y anteponerlos.
    try {
      const jotaRes = await this.getCachedPrismaProductos({
        ...filters,
        marca: ProductsService.JOTA_MARCA,
        offset: 0,
        limit: Math.max(limit, 12),
      });
      const jota = Array.isArray(jotaRes.data) ? jotaRes.data : [];
      if (!jota.length) return res;
      const merged = dedupPrepend(jota, rows);
      const data = limit > 0 ? merged.slice(0, limit) : merged;
      return { ...res, data };
    } catch (e) {
      this.logger.warn(`aplicarPrioridadJota falló: ${(e as any)?.message ?? e}`);
      return res;
    }
  }

  async getSuggestions(
    q: string,
    limit = 6,
  ): Promise<{
    data: { productos: any[]; terminos: string[]; complementos: string[] };
    success: boolean;
    message: string;
  }> {
    const termino = this.normFiltro(q);
    if (!termino) {
      return {
        data: { productos: [], terminos: [], complementos: [] },
        success: true,
        message: 'SIN TÉRMINO',
      };
    }

    const { data } = await this.findAll({
      search: termino,
      limit: 15,
      offset: 0,
      soloConStock: true,
    });
    const rows = Array.isArray(data) ? data : [];

    const productos = rows.slice(0, limit).map((p: any) => ({
      codigo: p.codigo_articulo,
      nombre: p.nombre_articulo,
      precio: p.precio ?? p.precioventa ?? p.precio_venta ?? null,
      imagen: Array.isArray(p.imagenes) ? (p.imagenes[0] ?? null) : null,
    }));

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

    const haystack = [
      qLower,
      ...rows.map((p: any) =>
        String(p.nombre_subcategoria || '').toLowerCase(),
      ),
      ...rows.map((p: any) => String(p.nombre_articulo || '').toLowerCase()),
    ];
    const complementos = complementosPara(qLower, haystack, 6);

    return {
      data: { productos, terminos, complementos },
      success: true,
      message: 'SUGERENCIAS',
    };
  }

  async getComplementosProducto(
    codigo: string,
  ): Promise<{ data: ComplementoNiveles; success: boolean; message: string }> {
    const cod = String(codigo ?? '').trim();
    if (!cod)
      return {
        data: { cercanos: [], lejanos: [] },
        success: true,
        message: 'SIN CODIGO',
      };
    try {
      // findAll (proc) trae nombre_subcategoria/nombre_categoria; el proc matchea por código.
      const { data } = await this.findAll({ search: cod, limit: 1, offset: 0 });
      const p: any = Array.isArray(data) ? data[0] : null;
      if (!p)
        return {
          data: { cercanos: [], lejanos: [] },
          success: true,
          message: 'NO ENCONTRADO',
        };
      const haystack = [
        String(p.nombre_subcategoria || '').toLowerCase(),
        String(p.nombre_categoria || '').toLowerCase(),
        String(p.nombre_articulo || p.nombre || '').toLowerCase(),
      ];
      const niveles = complementosNiveles(haystack);
      return { data: niveles, success: true, message: 'COMPLEMENTOS' };
    } catch (e) {
      this.logger.error('Error in getComplementosProducto:', e);
      return {
        data: { cercanos: [], lejanos: [] },
        success: true,
        message: 'ERROR',
      };
    }
  }

  async logSearch(
    termino: string,
    resultados = 0,
  ): Promise<{ success: boolean }> {
    const t = this.normFiltro(termino);
    if (!t) return { success: false };
    // Saneo: minúsculas, colapsar espacios, máx 4 palabras, dedupe de tokens
    // repetidos consecutivos y tope 40 chars → evita basura tipo
    // "amoladora makita varios herramientas makita varios makita...".
    const tokens = String(t)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((w, i, arr) => w && w !== arr[i - 1])
      .slice(0, 4);
    const norm = tokens.join(' ').slice(0, 40).trim();
    if (!norm) return { success: false };
    try {
      await this.searchTermWrite.query(
        `INSERT INTO search_terms (termino, total, ultimo_resultados, ultima_vez)
         VALUES (?, 1, ?, NOW())
         ON DUPLICATE KEY UPDATE total = total + 1, ultimo_resultados = VALUES(ultimo_resultados), ultima_vez = NOW()`,
        [norm, Number(resultados) || 0],
      );
      return { success: true };
    } catch (e) {
      this.logger.error('logSearch error', e as any);
      return { success: false };
    }
  }

  async getMasBuscado(
    limit = 8,
  ): Promise<{ data: string[]; success: boolean }> {
    try {
      // Solo términos "sanos": <=40 chars, con resultados, y máx ~4 palabras
      // (NOT LIKE '% % % % %' descarta 5+ palabras). Devuelve un pool para rotar.
      const rows = await this.searchTermRead.query(
        `SELECT termino FROM search_terms
          WHERE CHAR_LENGTH(termino) <= 40
            AND ultimo_resultados > 0
            AND termino NOT LIKE '% % % % %'
          ORDER BY total DESC, ultima_vez DESC
          LIMIT ?`,
        [Math.max(1, Math.min(20, Number(limit) || 8))],
      );
      return { data: (rows || []).map((r: any) => r.termino), success: true };
    } catch (e) {
      this.logger.error('getMasBuscado error', e as any);
      return { data: [], success: false };
    }
  }

  // ===================== AGENDAMIENTO + STOCK (checkout) =====================

  // Hora actual en Paraguay (America/Asuncion) sin depender de la TZ del server.
  private nowAsuncion(): { ymd: string; minutes: number; dow: number } {
    const tz = 'America/Asuncion';
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    const hh = parts.hour === '24' ? '00' : parts.hour;
    const ymd = `${parts.year}-${parts.month}-${parts.day}`;
    const minutes = Number(hh) * 60 + Number(parts.minute);
    const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // 0=Dom..6=Sab
    return { ymd, minutes, dow };
  }

  private hmsToMin(t: any): number | null {
    if (!t) return null;
    const [h, m] = String(t).split(':');
    const n = Number(h) * 60 + Number(m || 0);
    return Number.isFinite(n) ? n : null;
  }
  private minToHm = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  private addDaysYmd(ymd: string, days: number): string {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async getHorariosAgendamiento(): Promise<{ data: any[]; success: boolean }> {
    const rows = await this.productReadRepository.query(
      `SELECT numero_dia_semana AS dia, nombre_dia, horario_inicial, horario_final,
              horario_maximo, horario_corte, estado, regla_interior
         FROM tbl_horarios_agendamiento`,
    );
    const data = (rows || []).map((r: any) => ({
      dia: Number(r.dia),
      nombreDia: r.nombre_dia,
      inicial: String(r.horario_inicial || '').slice(0, 5),
      final: String(r.horario_final || '').slice(0, 5),
      maximo: r.horario_maximo ? String(r.horario_maximo).slice(0, 5) : null,
      corte: r.horario_corte ? String(r.horario_corte).slice(0, 5) : null,
      estado: Number(r.estado),
      reglaInterior:
        r.regla_interior == null
          ? false
          : Buffer.isBuffer(r.regla_interior)
            ? r.regla_interior[0] === 1
            : !!Number(r.regla_interior),
    }));
    return { data, success: true };
  }

  // Stock real por código (reusa la misma definición que el catálogo).
  async getStockByCodigos(
    codigos: string[],
  ): Promise<{
    data: { codigo: string; enStock: boolean }[];
    success: boolean;
  }> {
    const list = (codigos || []).map((c) => String(c).trim()).filter(Boolean);
    if (!list.length) return { data: [], success: true };
    const placeholders = list.map(() => '?').join(',');
    const rows = await this.productReadRepository.query(
      `SELECT a.codigo_articulo AS codigo, (${this.STOCK_EXISTS}) AS en_stock
         FROM articulo a
        WHERE a.codigo_articulo IN (${placeholders})`,
      list,
    );
    const found = new Map<string, boolean>();
    for (const r of rows || [])
      found.set(String(r.codigo).trim(), Number(r.en_stock) === 1);
    // Código no encontrado => sin stock (conservador).
    const data = list.map((codigo) => ({
      codigo,
      enStock: found.get(codigo) ?? false,
    }));
    return { data, success: true };
  }

  async getAgendamientoSlots(payload: {
    codigos: string[];
    ciudadId?: number;
    retirar?: boolean;
  }): Promise<{
    data: {
      allInStock: boolean;
      interior: boolean;
      retiro: boolean;
      slots: { fecha: string; dia: number; horas: string[] }[];
      avisos: string[];
    };
    success: boolean;
  }> {
    const retiro = !!payload?.retirar;
    const [{ data: stock }, { data: horarios }] = await Promise.all([
      this.getStockByCodigos(payload?.codigos || []),
      this.getHorariosAgendamiento(),
    ]);
    const allInStock = stock.length > 0 ? stock.every((s) => s.enStock) : true;

    // Interior de la ciudad
    let interior = false;
    const ciudadId = Number(payload?.ciudadId);
    if (Number.isFinite(ciudadId) && ciudadId > 0) {
      const cr = await this.productReadRepository.query(
        'SELECT interior FROM ciudad WHERE codigo = ? LIMIT 1',
        [ciudadId],
      );
      interior = Number(cr?.[0]?.interior) === 1;
    }

    const byDow = new Map<number, any>();
    for (const h of horarios) byDow.set(h.dia, h);

    const { ymd, minutes: nowMin, dow } = this.nowAsuncion();
    const avisos: string[] = [];
    const SLOT_STEP = 60; // slots por hora

    const horasEntre = (desdeMin: number, hastaMin: number): string[] => {
      const out: string[] = [];
      let start = Math.ceil(desdeMin / SLOT_STEP) * SLOT_STEP;
      for (let m = start; m <= hastaMin; m += SLOT_STEP)
        out.push(this.minToHm(m));
      return out;
    };

    const slots: { fecha: string; dia: number; horas: string[] }[] = [];

    if (retiro) {
      // Retiro en local: hoy desde ahora (dentro de ventana) + próximos días completos.
      for (let i = 0; i < 7 && slots.length < 5; i++) {
        const fecha = this.addDaysYmd(ymd, i);
        const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
        const h = byDow.get(ddow);
        if (!h || h.estado !== 1) continue;
        const ini = this.hmsToMin(h.inicial)!;
        const fin = this.hmsToMin(h.final)!;
        const desde = i === 0 ? Math.max(ini, nowMin) : ini;
        if (i === 0 && nowMin > fin) continue;
        const horas = horasEntre(desde, fin);
        if (horas.length) slots.push({ fecha, dia: ddow, horas });
      }
      return {
        data: { allInStock, interior, retiro, slots, avisos },
        success: true,
      };
    }

    // -------- Delivery --------
    if (interior) {
      avisos.push(
        'Tu ciudad es del interior: la entrega se agenda para el día siguiente o posterior.',
      );
      // Sólo días con regla_interior=1; entrega desde el día siguiente.
      for (let i = 1; i <= 9 && slots.length < 5; i++) {
        const fecha = this.addDaysYmd(ymd, i);
        const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
        const h = byDow.get(ddow);
        if (!h || h.estado !== 1 || !h.reglaInterior) continue;
        const ini = this.hmsToMin(h.inicial)!;
        const max = this.hmsToMin(h.maximo) ?? this.hmsToMin(h.final)!;
        const horas = horasEntre(ini, max);
        if (horas.length) slots.push({ fecha, dia: ddow, horas });
      }
      return {
        data: { allInStock, interior, retiro, slots, avisos },
        success: true,
      };
    }

    // Capital
    const hoy = byDow.get(dow);
    if (hoy && hoy.estado === 1) {
      const ini = this.hmsToMin(hoy.inicial)!;
      const fin = this.hmsToMin(hoy.final)!;
      const max = this.hmsToMin(hoy.maximo) ?? fin;
      const corte = this.hmsToMin(hoy.corte);
      if (nowMin < ini)
        avisos.push(`Los pedidos se reciben desde las ${hoy.inicial}.`);
      const earliest = Math.max(nowMin + 240, ini); // +4h de preparación
      let hoyPosible = false;
      if (nowMin <= fin) {
        if (allInStock) hoyPosible = earliest <= max;
        else hoyPosible = corte != null && nowMin <= corte && earliest <= max;
      }
      if (hoyPosible) {
        const horas = horasEntre(earliest, max);
        if (horas.length) slots.push({ fecha: ymd, dia: dow, horas });
      } else if (!allInStock) {
        avisos.push(
          'Hay artículos sin stock: la entrega se agenda para el día siguiente desde las 10:00.',
        );
      }
    }

    // Días siguientes
    const startNext = this.hmsToMin('10:00')!; // sin stock o tras el corte: arranca 10:00
    for (let i = 1; i <= 9 && slots.length < 5; i++) {
      const fecha = this.addDaysYmd(ymd, i);
      const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
      const h = byDow.get(ddow);
      if (!h || h.estado !== 1) continue;
      const ini = this.hmsToMin(h.inicial)!;
      const max = this.hmsToMin(h.maximo) ?? this.hmsToMin(h.final)!;
      const desde = allInStock ? ini : Math.max(startNext, ini);
      const horas = horasEntre(desde, max);
      if (horas.length) slots.push({ fecha, dia: ddow, horas });
    }

    return {
      data: { allInStock, interior, retiro, slots, avisos },
      success: true,
    };
  }

  async prefetchfindAll(filters: any = {}): Promise<{
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
    const cached = await this.cache.get<{ data: any[]; total: number }>(
      cacheKey,
    );
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
