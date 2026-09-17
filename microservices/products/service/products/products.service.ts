import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import {
  ResilientService,
  ResilientOptions,
} from '@shared/common/decorators/resilient-client.decorator';
import { Repository, In } from 'typeorm';
import { PromosService } from '../promos/promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { Product } from '../../schemas/products/product.schemas';
import { ProductsImage } from '../../schemas/products/products-image.schema';
import { SearchTerm } from '../../schemas/search/search-term.schema';
import {
  complementosPara,
  complementosNiveles,
  type ComplementoNiveles,
} from '../../utils/products/complementos';
import { ProductsImagesService } from './products-images.service';
import { ProductsUtils } from '@products/utils/products/utils-products';
import { PromoPricingUtil } from '@products/utils/products/promo-pricing.util';
import { parseNota } from '@products/utils/products/parse-nota.util';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { ProductsResilienceUtil } from '@products/utils/products/products-resilience.util';
import { ProductsCatalogUtil } from '@products/utils/products/products-catalog.util';

interface CartResponse {
  data: any[];
  success: boolean;
  message: string;
  total: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  readonly JOTA_MARCA = 257;
  readonly JOTA_FAMILIAS = new Set([4, 5, 6, 7]);
  readonly JOTA_KEYWORDS =
    /(cocina|anafe|heladera|refriger|freezer|climatiz|aire|lavarrop|lavado|lavasecarropas)/i;

  constructor(
    @InjectRepository(Product, 'WRITE_CONNECTION')
    private readonly productWriteRepository: Repository<Product>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    private readonly promosService: PromosService,
    private readonly productsUtils: ProductsUtils,
    private readonly promoPricingUtil: PromoPricingUtil,
    private readonly productsImagesService: ProductsImagesService,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly resilientService: ResilientService,
    private readonly cache: CachePersistenteService,
    @InjectRepository(SearchTerm, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly searchTermWrite: Repository<SearchTerm>,
    @InjectRepository(SearchTerm, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly searchTermRead: Repository<SearchTerm>,
    private readonly productsResilience: ProductsResilienceUtil,
    private readonly productsCatalogUtil: ProductsCatalogUtil,
  ) {}

  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly PRODUCT_CACHE_TTL = 10 * 60 * 1000;
  private readonly WEB_BASE_WHERE = `a.baja = 0 AND (a.websc = 1 OR a.web = 1)`;
  private readonly STOCK_EXISTS = `EXISTS (
    SELECT 1 FROM tbl_stock_actual sa
      JOIN deposito d ON d.codigo = sa.deposito
     WHERE sa.codigo_articulo = a.codigo_articulo
       AND d.habilitado_reserva = 1 AND d.codigo NOT IN (19,20,26,27,28,33) AND d.codigo_proveedor = 0
       AND sa.cantidad_actual > 0)`;
  private readonly STALE_TTL = 24 * 60 * 60 * 1000;

  invalidateCache(): void {
    void this.cache.delByPrefix('products:');
  }

  async getCatalogoV2(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `products:v2:${this.productsCatalogUtil.getCacheKey(filters)}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(
      cacheKey,
    );
    if (cached) return cached;

    const MAX_LIMIT = 100;
    const rawLimit = Number(filters.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : 50;
    const offset = Number(filters.offset) || 0;
    const f = this.productsUtils.buildProcFilters(filters);
    const staleKey = `products:v2:stale:${this.productsCatalogUtil.getCacheKey(filters)}`;

    const payload = await this.productsResilience.withDbResilience(
      'catalogoV2',
      staleKey,
      async () => {
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

        const dataConCuotas = await this.productsUtils.enrichProductRows(
          result[0] || [],
          this.productsImagesReadRepository,
        );
        const total = await this.productsUtils.contarProductosV2(
          filters,
          this.WEB_BASE_WHERE,
          await this.productsResilience.getStockDepositoIds(),
        );
        const response = { data: dataConCuotas as any[], total };
        this.productsResilience.assertResponseWithinNatsLimit(response, 'get_catalogo_v2');
        return response;
      },
    );

    await this.cache.set(cacheKey, payload, this.CACHE_TTL);
    return payload;
  }

  async getFacets(): Promise<any> {
    const cached = await this.cache.get('products:facets');
    if (cached) return cached;
    const depositoIds = await this.productsResilience.getStockDepositoIds();
    const stockJoin = this.productsResilience.stockJoinSql(depositoIds);
    const baseWhere = this.WEB_BASE_WHERE;
    const [categorias, marcas, proveedores, precio] = await Promise.all([
      this.productReadRepository.query(
        `SELECT a.familia AS codigo, f.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN familia f ON f.codigo = a.familia
           ${stockJoin}
          WHERE ${baseWhere} GROUP BY a.familia, f.nombre ORDER BY f.nombre`,
      ),
      this.productReadRepository.query(
        `SELECT a.marca AS codigo, m.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN marca m ON m.codigo = a.marca
           ${stockJoin}
          WHERE ${baseWhere} GROUP BY a.marca, m.nombre ORDER BY total DESC`,
      ),
      this.productReadRepository.query(
        `SELECT a.proveedor AS codigo, pv.nombre AS nombre, COUNT(*) AS total
           FROM articulo a JOIN proveedor pv ON pv.codigo = a.proveedor
           ${stockJoin}
          WHERE ${baseWhere} GROUP BY a.proveedor, pv.nombre ORDER BY pv.nombre`,
      ),
      this.productReadRepository.query(
        `SELECT MIN(NULLIF(a.precioventa, 0)) AS min, MAX(a.precioventa) AS max
           FROM articulo a
           ${stockJoin}
          WHERE ${baseWhere} AND a.precioventa > 0`,
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
    const filtersConImagenes = { ...filters, soloConImagenes: true };
    const res = await this.productsCatalogUtil.getCachedPrismaProductos(
      filtersConImagenes,
      this.WEB_BASE_WHERE,
    );
    return this.productsUtils.aplicarPrioridadJota(
      res,
      filtersConImagenes,
      this,
      (f: any) => this.productsCatalogUtil.getCachedPrismaProductos(f, this.WEB_BASE_WHERE),
    );
  }

  async getSuggestions(
    q: string,
    limit = 6,
  ): Promise<{
    data: { productos: any[]; terminos: string[]; complementos: string[] };
    success: boolean;
    message: string;
  }> {
    const termino = this.productsUtils.normFiltro(q);
    if (!termino) {
      return {
        data: { productos: [], terminos: [], complementos: [] },
        success: true,
        message: 'SIN TÉRMINO',
      };
    }

    const { data } = await this.productsCatalogUtil.getCachedPrismaProductos(
      {
        search: termino,
        limit: 15,
        offset: 0,
        soloConStock: true,
      },
      this.WEB_BASE_WHERE,
    );
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

    const candidatosComplementos = complementosPara(qLower, haystack, 12);
    const complementos = (
      await this.productsUtils.complementosDisponibles(
        candidatosComplementos,
        this.WEB_BASE_WHERE,
        this.cache,
        this.CACHE_TTL,
        this.STOCK_EXISTS,
      )
    ).slice(0, 6);

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
      const { data } = await this.productsCatalogUtil.getCachedPrismaProductos(
        { search: cod, limit: 1, offset: 0 },
        this.WEB_BASE_WHERE,
      );
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
      const [cercanos, lejanos] = await Promise.all([
        this.productsUtils.complementosDisponibles(
          niveles.cercanos,
          this.WEB_BASE_WHERE,
          this.cache,
          this.CACHE_TTL,
          this.STOCK_EXISTS,
        ),
        this.productsUtils.complementosDisponibles(
          niveles.lejanos,
          this.WEB_BASE_WHERE,
          this.cache,
          this.CACHE_TTL,
          this.STOCK_EXISTS,
        ),
      ]);
      return {
        data: { cercanos, lejanos },
        success: true,
        message: 'COMPLEMENTOS',
      };
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
    const t = this.productsUtils.normFiltro(termino);
    if (!t) return { success: false };
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

  async getStockByCodigos(codigos: string[]): Promise<{
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

    const { ymd, minutes: nowMin, dow } = this.productsUtils.nowAsuncion();
    const avisos: string[] = [];
    const SLOT_STEP = 60;

    const horasEntre = (desdeMin: number, hastaMin: number): string[] => {
      const out: string[] = [];
      let start = Math.ceil(desdeMin / SLOT_STEP) * SLOT_STEP;
      for (let m = start; m <= hastaMin; m += SLOT_STEP)
        out.push(this.productsUtils.minToHm(m));
      return out;
    };

    const slots: {
      fecha: string;
      dia: number;
      horas: string[];
      horaMin?: string;
      horaMax?: string;
    }[] = [];

    if (retiro) {
      for (let i = 0; i < 7 && slots.length < 5; i++) {
        const fecha = this.productsUtils.addDaysYmd(ymd, i);
        const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
        const h = byDow.get(ddow);
        if (!h || h.estado !== 1) continue;
        const ini = this.productsUtils.hmsToMin(h.inicial)!;
        const fin = this.productsUtils.hmsToMin(h.final)!;
        const desde = i === 0 ? Math.max(ini, nowMin) : ini;
        if (i === 0 && nowMin > fin) continue;
        const horas = horasEntre(desde, fin);
        if (horas.length)
          slots.push({
            fecha,
            dia: ddow,
            horas,
            horaMin: h.inicial,
            horaMax: h.final,
          });
      }
      return {
        data: { allInStock, interior, retiro, slots, avisos },
        success: true,
      };
    }

    if (interior) {
      avisos.push(
        'Tu ciudad es del interior: la entrega se agenda para el día siguiente o posterior.',
      );
      for (let i = 1; i <= 9 && slots.length < 5; i++) {
        const fecha = this.productsUtils.addDaysYmd(ymd, i);
        const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
        const h = byDow.get(ddow);
        if (!h || h.estado !== 1 || !h.reglaInterior) continue;
        const ini = this.productsUtils.hmsToMin(h.inicial)!;
        const fin = this.productsUtils.hmsToMin(h.final)!;
        const horas = horasEntre(ini, fin);
        if (horas.length)
          slots.push({
            fecha,
            dia: ddow,
            horas,
            horaMin: h.inicial,
            horaMax: h.final,
          });
      }
      return {
        data: { allInStock, interior, retiro, slots, avisos },
        success: true,
      };
    }

    const hoy = byDow.get(dow);
    if (hoy && hoy.estado === 1) {
      const ini = this.productsUtils.hmsToMin(hoy.inicial)!;
      const fin = this.productsUtils.hmsToMin(hoy.final)!;
      const maximo = this.productsUtils.hmsToMin(hoy.maximo) ?? fin;
      const corte = this.productsUtils.hmsToMin(hoy.corte);
      if (nowMin < ini)
        avisos.push(`Los pedidos se reciben desde las ${hoy.inicial}.`);
      const earliest = Math.max(nowMin + 240, ini);
      const maximoLimite = maximo - 30;
      const corteLimite = corte != null ? corte - 30 : null;
      let hoyPosible = false;
      if (nowMin <= fin) {
        const dentroDeMaximo = nowMin <= maximoLimite;
        const dentroDeCorte = corteLimite == null || nowMin <= corteLimite;
        hoyPosible = dentroDeMaximo && dentroDeCorte;
      }
      if (hoyPosible) {
        const horas = horasEntre(earliest, fin);
        if (horas.length)
          slots.push({
            fecha: ymd,
            dia: dow,
            horas,
            horaMin: hoy.inicial,
            horaMax: hoy.final,
          });
        else if (!allInStock) {
          avisos.push(
            'Uno de tus artículos está teniendo mucha demanda 🙌 así que vamos a necesitar un poquito más de tiempo para preparar tu envío.',
          );
        }
      } else if (!allInStock) {
        avisos.push(
          'Uno de tus artículos está teniendo mucha demanda 🙌 así que vamos a necesitar un poquito más de tiempo para preparar tu envío.',
        );
      }
    }

    const startNext = this.productsUtils.hmsToMin('10:00')!;
    for (let i = 1; i <= 9 && slots.length < 5; i++) {
      const fecha = this.productsUtils.addDaysYmd(ymd, i);
      const ddow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
      const h = byDow.get(ddow);
      if (!h || h.estado !== 1) continue;
      const ini = this.productsUtils.hmsToMin(h.inicial)!;
      const fin = this.productsUtils.hmsToMin(h.final)!;
      const desde = allInStock ? ini : Math.max(startNext, ini);
      const horas = horasEntre(desde, fin);
      if (horas.length)
        slots.push({
          fecha,
          dia: ddow,
          horas,
          horaMin: h.inicial,
          horaMax: h.final,
        });
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
    const MAX_CODIGOS = 50;
    const lista = [
      ...new Set(codigos.map((c) => String(c).trim()).filter(Boolean)),
    ].slice(0, MAX_CODIGOS);
    if (lista.length === 0) return { data: [], total: 0 };

    const staleKey = `products:byCodigos:stale:${lista.slice().sort().join(',')}`;
    const dataConCuotas = await this.productsResilience.withDbResilience(
      'byCodigos',
      staleKey,
      async () => {
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

        const codsForSello = productos.map((p) =>
          String(p.codigo_articulo).trim(),
        );
        const selloMap =
          await this.productsImagesService.getSelloMapForCodigos(codsForSello);

        const enriquecidos = productos.map((p: any) => {
          const cod = String(p.codigo_articulo).trim();
          const { descripcion, caracteristicas } = parseNota(p.nota);
          return {
            ...p,
            codigo_articulo: cod,
            nombre_articulo: String(p.nombre ?? '').trim(),
            descripcion,
            caracteristicas,
            imagenes: imagenesMap.get(cod) || [],
            sello: selloMap.get(cod) || null,
          };
        });

        const byCod = new Map(enriquecidos.map((d) => [d.codigo_articulo, d]));
        const ordered = lista.map((c) => byCod.get(c)).filter(Boolean);

        const conCredito =
          await this.productsUtils.calculoCreditoProductos(ordered);
        return this.productsUtils.aplicarPreciosPromo(conCredito);
      },
    );

    const lim = Number(limit) || dataConCuotas.length;
    const result = {
      data: dataConCuotas.slice(0, lim),
      total: dataConCuotas.length,
    };
    this.productsResilience.assertResponseWithinNatsLimit(result, 'get_products_by_codigos');
    return result;
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
    const jotaFilters = { ...filters, marca: 257 };
    const cacheKey = `products:jota:${this.productsCatalogUtil.getCacheKey({ ...jotaFilters, type: 'jota' })}`;
    const cached = await this.cache.get<{ data: any[]; total: number }>(
      cacheKey,
    );
    if (cached) {
      return { data: cached.data, total: cached.total };
    }
    const jotaRawLimit = Number(filters.limit);
    const limit =
      Number.isFinite(jotaRawLimit) && jotaRawLimit > 0
        ? Math.min(jotaRawLimit, 100)
        : 50;
    const offset = Number(filters.offset) || 0;
    const f = this.productsUtils.buildProcFilters(jotaFilters);
    const staleKey = `products:jota:stale:${this.productsCatalogUtil.getCacheKey({ ...jotaFilters, type: 'jota' })}`;

    const payload = await this.productsResilience.withDbResilience('jota', staleKey, async () => {
      const [productos, total] = await Promise.all([
        this.productReadRepository
          .query(
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
          )
          .then((r) => r[0] || []),
        this.productsCatalogUtil.contarProductos(jotaFilters, this.WEB_BASE_WHERE),
      ]);

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

      const selloMap =
        await this.productsImagesService.getSelloMapForCodigos(
          codigosProductos,
        );

      const dataWithTrimmedNames = productos.map((item: any) => {
        const { descripcion, caracteristicas } = parseNota(item.nota);
        return {
          ...item,
          codigo_articulo: item.codigo_articulo.trim(),
          nombre_articulo: item.nombre_articulo.trim(),
          nombre_subcategoria: item.nombre_subcategoria.trim(),
          nombre_marca: item.nombre_marca.trim(),
          nombre_proveedor: item.nombre_proveedor.trim(),
          codigo_de_barra: item.codigo_de_barra.trim(),
          descripcion,
          caracteristicas,
          imagenes: imagenesMap.get(item.codigo_articulo.trim()) || [],
          sello: selloMap.get(item.codigo_articulo.trim()) || null,
        };
      });

      const data = dataWithTrimmedNames || [];
      const conCredito = await this.productsUtils.calculoCreditoProductos(data);
      const dataConCuotas =
        await this.productsUtils.aplicarPreciosPromo(conCredito);
      return { data: dataConCuotas as any[], total };
    });

    await this.cache.set(cacheKey, payload, this.CACHE_TTL);
    return payload;
  }

  async getPromoInfoForCodigos(
    codigos: string[],
  ): Promise<Record<string, any>> {
    const map = await this.promoPricingUtil.getPromoInfoForCodigos(
      codigos || [],
    );
    return Object.fromEntries(map);
  }

  async listEcontPromotions(filtros?: {
    desde?: string;
    hasta?: string;
  }): Promise<any[]> {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const desde = filtros?.desde || inicioMes.toISOString().slice(0, 10);
    const hasta = filtros?.hasta || ahora.toISOString().slice(0, 10);
    const staleKey = `promotions:econt:stale:${desde}:${hasta}`;
    const ERP_QUERY_TIMEOUT_MS = 10000;

    return this.productsResilience.withDbResilience('listEcontPromotions', staleKey, async () => {
      return Promise.race([
        this.productReadRepository.query(
          `SELECT id_promo, nombre, fecha_inicio, fecha_fin, canal, tipo_promocion, estado
             FROM tbl_promos_cabeceras
            WHERE canal IN ('ambos', 'ecommerce')
              AND estado IN (1, 2)
              AND fecha_inicio <= ?
              AND fecha_fin >= ?
            ORDER BY fecha_inicio DESC`,
          [hasta, desde],
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout consultando promociones ECONT (${ERP_QUERY_TIMEOUT_MS}ms)`)),
            ERP_QUERY_TIMEOUT_MS,
          ),
        ),
      ]);
    });
  }

  async getRendimientoPromocion(
    idPromo: number,
    desde: string,
    hasta: string,
  ): Promise<{
    data: {
      totalFacturado: number;
      cantidadDocumentos: number;
      totalContado: number;
      cantidadContado: number;
      porcentajeContado: number;
      totalCredito: number;
      cantidadCredito: number;
      porcentajeCredito: number;
      detalle: any[];
    };
    message: string;
    success: boolean;
  }> {
    try {
      const [agregado, detalle] = await Promise.all([
        this.productReadRepository.query(
          `SELECT COALESCE(SUM(sd.gravada10), 0) AS totalFacturado,
                  COUNT(DISTINCT CONCAT(sc.comprobante, '-', sc.numero)) AS cantidadDocumentos,
                  COALESCE(SUM(CASE WHEN sc.cuota = 1 THEN sd.gravada10 ELSE 0 END), 0) AS totalContado,
                  COUNT(CASE WHEN sc.cuota = 1 THEN 1 END) AS cantidadContado,
                  COALESCE(SUM(CASE WHEN sc.cuota = 2 THEN sd.gravada10 ELSE 0 END), 0) AS totalCredito,
                  COUNT(CASE WHEN sc.cuota = 2 THEN 1 END) AS cantidadCredito
             FROM solicitudcab sc
             INNER JOIN solicituddet sd ON sd.comprobante = sc.comprobante AND sd.numero = sc.numero AND sd.id_promo = ?
            WHERE sc.age_frecepcion BETWEEN ? AND ?
              AND sc.comprobante IN (SELECT vd2.codigo FROM vendedor vd2 WHERE vd2.coordinador = 52)
              AND sc.estado_soli NOT IN ('31', '25', '37')
              AND sc.estado_soli IN ('19', '16')`,
          [idPromo, desde, hasta],
        ),
        this.productReadRepository.query(
          `SELECT sc.comprobante, sc.numero, vd.nombre, sc.fecha, sc.age_frecepcion,
                  sd.codigo, sd.descrip, sd.gravada10, sc.estado_soli, tes.estado,
                  CASE WHEN sc.cuota = 1 THEN 'CONTADO' WHEN sc.cuota = 2 THEN 'CREDITO' ELSE NULL END AS forma_pago
             FROM solicitudcab sc
             INNER JOIN solicituddet sd ON sd.comprobante = sc.comprobante AND sd.numero = sc.numero
             INNER JOIN vendedor vd ON vd.codigo = sc.comprobante
             INNER JOIN tbl_estados_solicitud tes ON tes.codigo_estado_solicitud = sc.estado_soli
            WHERE sd.id_promo = ?
              AND sc.age_frecepcion BETWEEN ? AND ?
              AND sc.comprobante IN (SELECT vd2.codigo FROM vendedor vd2 WHERE vd2.coordinador = 52)
              AND sc.estado_soli NOT IN ('31', '25', '37')
              AND sc.estado_soli IN (19, 16)
            ORDER BY sc.age_frecepcion, sc.comprobante, sc.numero`,
          [idPromo, desde, hasta],
        ),
      ]);

      const totalFacturado = Number(agregado?.[0]?.totalFacturado || 0);
      const totalContado = Number(agregado?.[0]?.totalContado || 0);
      const totalCredito = Number(agregado?.[0]?.totalCredito || 0);

      return {
        data: {
          totalFacturado,
          cantidadDocumentos: Number(agregado?.[0]?.cantidadDocumentos || 0),
          totalContado,
          cantidadContado: Number(agregado?.[0]?.cantidadContado || 0),
          porcentajeContado: totalFacturado > 0 ? (totalContado / totalFacturado) * 100 : 0,
          totalCredito,
          cantidadCredito: Number(agregado?.[0]?.cantidadCredito || 0),
          porcentajeCredito: totalFacturado > 0 ? (totalCredito / totalFacturado) * 100 : 0,
          detalle: detalle || [],
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando rendimiento de promoción: ${error.message}`);
      return {
        data: {
          totalFacturado: 0,
          cantidadDocumentos: 0,
          totalContado: 0,
          cantidadContado: 0,
          porcentajeContado: 0,
          totalCredito: 0,
          cantidadCredito: 0,
          porcentajeCredito: 0,
          detalle: [],
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async buscarDocumentoPorSecuencia(secuencia: number): Promise<{
    data: {
      secuencia: number;
      comprobante: number;
      numero: number;
      fecha: string;
      age_frecepcion: string;
      cliente_nombre: string;
      estado_soli: string;
      estado: string;
      gravada10: number;
    } | null;
    message: string;
    success: boolean;
  }> {
    try {
      const rows = await this.productReadRepository.query(
        `SELECT sc.secuencia, sc.comprobante, sc.numero, sc.fecha, sc.age_frecepcion,
                cl.nombre AS cliente_nombre, sc.estado_soli, tes.estado, sc.gravada10
           FROM solicitudcab sc
           LEFT JOIN cliente cl ON cl.codigo = sc.cliente
           LEFT JOIN tbl_estados_solicitud tes ON tes.codigo_estado_solicitud = sc.estado_soli
          WHERE sc.secuencia = ?
          LIMIT 1`,
        [secuencia],
      );

      if (!rows?.[0]) {
        return { data: null, message: 'Secuencia no encontrada', success: false };
      }

      return { data: rows[0], message: 'Ok', success: true };
    } catch (error) {
      this.logger.error(`Error buscando documento por secuencia: ${error.message}`);
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async getEcontPromotionProducts(
    idPromo: number,
  ): Promise<{ data: any[]; total: number }> {
    const detalles = await this.productReadRepository.query(
      `SELECT DISTINCT d.codigo_identificador AS codigo_articulo
         FROM tbl_promos_detalles d
         JOIN tbl_promos_cabeceras c ON c.id_promo = d.id_promo
        WHERE d.id_promo = ?
          AND d.tipo_codigo = 1
          AND c.estado = 1
          AND c.canal IN ('ambos', 'ecommerce')`,
      [idPromo],
    );
    const codigos = (detalles || []).map((r: any) =>
      String(r.codigo_articulo).trim(),
    );
    return this.getProductsByCodigos(codigos, codigos.length);
  }

  async updateProductSello(
    productoCodigo: string,
    file: any,
    userId?: string,
    fechaDesde?: string | Date | null,
    fechaHasta?: string | Date | null,
  ): Promise<{ data: any; message: string; success: boolean }> {
    return this.productsImagesService.uploadProductSello(
      productoCodigo,
      file,
      userId,
      fechaDesde,
      fechaHasta,
    );
  }

  async deleteProductSello(productoCodigo: string) {
    return this.productsImagesService.deleteProductSello(productoCodigo);
  }

  async getFilteredProductsCount(filters: any = {}): Promise<number> {
    return this.productsCatalogUtil.contarProductos(filters, this.WEB_BASE_WHERE);
  }

  // Códigos de artículo que matchean un filtro, con el mismo criterio (WEB_BASE_WHERE,
  // precio mínimo publicable, stock) que usa el listado de productos. Usado por
  // SellosReglasService para saber a qué productos aplicar/retirar un sello por filtro.
  async getCodigosMatchingFilters(
    filters: any = {},
    limitCap = 20000,
  ): Promise<string[]> {
    const f = this.productsUtils.buildProcFilters(filters);
    const busquedaCond = this.productsUtils.buildBusquedaSql(f.busqueda);
    const depositoIds = await this.productsResilience.getStockDepositoIds();

    const rows = await this.productReadRepository.query(
      `SELECT a.codigo_articulo AS codigo_articulo
         FROM articulo a
         ${this.productsResilience.stockJoinSql(depositoIds)}
        WHERE ${this.WEB_BASE_WHERE}
          AND a.precioventa >= 9000
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND ${busquedaCond.sql}
        LIMIT ?`,
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
        limitCap,
      ],
    );
    return (rows || [])
      .map((r: any) => (r.codigo_articulo == null ? '' : String(r.codigo_articulo).trim()))
      .filter(Boolean);
  }
}
