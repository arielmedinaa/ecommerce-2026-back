import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../schemas/product.schemas';
import { ProductsSello } from '../schemas/products-sello.schema';
import { Repository } from 'typeorm';
import { PromoPricingUtil } from './promo-pricing.util';

@Injectable()
export class ProductsUtils {
  private readonly logger = new Logger(ProductsUtils.name);
  private cuotasCache: any[] | null = null;
  private cuotasCacheTimestamp: number = 0;
  private readonly CUOTAS_CACHE_TTL = 10 * 60 * 1000;

  private readonly SEARCH_SYNONYMS = {
    televisores: [
      'televisor',
      'tv',
      'television',
      'tele',
      'televisión',
      'smart tv',
      'smarttv',
    ],
    smartphones: [
      'smartphone',
      'celular',
      'móvil',
      'phone',
      'cel',
      'movil',
      'telefono',
    ],
    laptops: ['laptop', 'computadora', 'pc', 'portátil', 'notebook', 'netbook'],
    tablets: ['tablet', 'tableta', 'tabletta', 'tablette'],
    auriculares: [
      'auricular',
      'auriculares',
      'audífonos',
      'audífono',
      'cascos',
      'manos libres',
    ],
    consolas: [
      'consola',
      'consolas',
      'videojuego',
      'videojuegos',
      'play',
      'playstation',
      'xbox',
      'nintendo',
    ],
    gaming: ['gaming', 'gamer', 'gaming pc', 'gaming laptop', 'juegos'],
    smartwatches: [
      'smartwatch',
      'reloj inteligente',
      'reloj digital',
      'smart watch',
    ],
    cameras: [
      'cámara',
      'camara',
      'cámara digital',
      'camara digital',
      'cámara web',
      'camara web',
    ],
    audio: [
      'audio',
      'sonido',
      'altavoz',
      'altavoces',
      'bocina',
      'bocinas',
      'parlante',
      'parlantes',
    ],
  };

  private readonly BRAND_VARIATIONS = {
    samsung: ['samsung', 'samsumg', 'samsun'],
    lg: ['lg', "life's good"],
    sony: ['sony', 'soni'],
    philips: ['philips', 'philip'],
    motorola: ['motorola', 'moto'],
    alcatel: ['alcatel', 'alcate'],
    xiaomi: ['xiaomi', 'redmi', 'mi'],
    apple: ['apple', 'iphone', 'ipad', 'mac'],
  };

  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    @InjectRepository(ProductsSello, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsSelloReadRepository: Repository<ProductsSello>,
    private readonly promoPricingUtil: PromoPricingUtil,
  ) {}

  buildProcFilters(filters: any = {}) {
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

  async enrichProductRows(
    productos: any[],
    productsImagesReadRepository: any,
  ): Promise<any[]> {
    const codigosProductos = productos.map((item: any) =>
      item.codigo_articulo.trim(),
    );
    const imagenesMap = new Map();
    if (codigosProductos.length > 0) {
      const imagenes = await productsImagesReadRepository
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

    const selloMap = new Map<string, string>();
    if (codigosProductos.length > 0) {
      const sellos = await this.productsSelloReadRepository
        .createQueryBuilder('s')
        .where('s.producto_codigo IN (:...codigos)', {
          codigos: codigosProductos,
        })
        .andWhere('s.activo = :activo', { activo: true })
        .getMany();
      sellos.forEach((s) => selloMap.set(s.producto_codigo, s.url_sello));
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
      sello: selloMap.get(item.codigo_articulo.trim()) || null,
    }));

    const conCredito = await this.calculoCreditoProductos(
      dataWithTrimmedNames || [],
    );
    return this.aplicarPreciosPromo(conCredito);
  }

  async aplicarPreciosPromo(products: any[]): Promise<any[]> {
    if (!Array.isArray(products) || products.length === 0) return products;

    const codigos = products.map((p: any) => p.codigo_articulo);
    const promoMap = await this.promoPricingUtil.getPromoInfoForCodigos(codigos);
    if (promoMap.size === 0) return products;

    return products.map((product: any) => {
      const promo = promoMap.get(String(product.codigo_articulo).trim());
      if (!promo) return product;

      const cuotasPromo = promo.cuotas
        .slice()
        .sort((a, b) => a.cuota - b.cuota)
        .map((c) => ({
          cuota: c.cuota,
          incremento: null,
          precio: c.precio,
          precioFormateado: c.precio.toFixed(0),
          precioOriginal: c.precioOriginal,
        }));

      return {
        ...product,
        precioventaRedondeado:
          promo.contado !== null ? promo.contado : product.precioventaRedondeado,
        precioventa: promo.contado !== null ? promo.contado : product.precioventa,
        preciotope: promo.original !== null ? promo.original : product.preciotope,
        cuotas: cuotasPromo.length > 0 ? cuotasPromo : product.cuotas,
        enPromo: true,
        idPromo: promo.idPromo,
        promoTieneContado: promo.contado !== null,
        promoDisponibleEcommerce: promo.disponibleEcommerce,
      };
    });
  }

  async aplicarPreciosPromoOferta(productos: any[]): Promise<any[]> {
    if (!Array.isArray(productos) || productos.length === 0) return productos;

    const codigos = productos.map((p: any) => p.codigo_articulo);
    const promoMap = await this.promoPricingUtil.getPromoInfoForCodigos(codigos);
    if (promoMap.size === 0) return productos;

    return productos.map((producto: any) => {
      const promo = promoMap.get(String(producto.codigo_articulo).trim());
      if (!promo) return producto;

      const cuotasPromo = promo.cuotas
        .slice()
        .sort((a, b) => a.cuota - b.cuota)
        .map((c) => ({
          cuota: c.cuota,
          incremento: null,
          precio: c.precio,
          precioFormateado: c.precio.toFixed(0),
          precioOriginal: c.precioOriginal,
        }));

      return {
        ...producto,
        precioContadoRedondeado:
          promo.contado !== null ? promo.contado : producto.precioContadoRedondeado,
        precioContado: promo.contado !== null ? promo.contado : producto.precioContado,
        precioCredito: promo.contado !== null ? promo.contado : producto.precioCredito,
        precioOriginal: promo.original !== null ? promo.original : producto.precioOriginal,
        cuotas: cuotasPromo.length > 0 ? cuotasPromo : producto.cuotas,
        enPromo: true,
        idPromo: promo.idPromo,
        promoTieneContado: promo.contado !== null,
        promoDisponibleEcommerce: promo.disponibleEcommerce,
      };
    });
  }

  async calculoCreditoProductos(products: any[]) {
    if (!Array.isArray(products)) {
      this.logger.error('Error: products no es un array:', products);
      return products;
    }

    let cuotas = this.cuotasCache;
    const now = Date.now();

    if (!cuotas || now - this.cuotasCacheTimestamp > this.CUOTAS_CACHE_TTL) {
      cuotas = await this.productReadRepository.query(
        'SELECT * FROM cuota ORDER BY cuota',
      );
      this.cuotasCache = cuotas;
      this.cuotasCacheTimestamp = now;
    }

    return products.map((product: any) => {
      const precioVenta = parseFloat(product.precioventa);
      let precioVentaRedondeado = precioVenta;
      if (precioVenta % 1000 !== 0) {
        precioVentaRedondeado = Math.ceil(precioVenta / 1000) * 1000;
      }

      const cuotasCalculadas = cuotas.map((cuota: any) => {
        const cuotaNumero = cuota.cuota;
        const incremento = parseFloat(cuota.incremento);
        let precioConRecargo =
          precioVentaRedondeado + (precioVentaRedondeado * incremento) / 100;

        if (precioConRecargo % 1000 !== 0) {
          precioConRecargo = Math.ceil(precioConRecargo / 1000) * 1000;
        }

        return {
          cuota: cuotaNumero,
          incremento: incremento,
          precio: precioConRecargo,
          precioFormateado: precioConRecargo.toFixed(0),
        };
      });

      return {
        ...product,
        // El redondeado al millar es la fuente de la verdad — Contado (precioventa)
        // debe coincidir con Crédito (precioventaRedondeado), no con el crudo del ERP.
        precioventa: precioVentaRedondeado,
        precioventaRedondeado: precioVentaRedondeado,
        cuotas: cuotasCalculadas,
      };
    });
  }

  async calculoCreditoProductosOferta(productos: any[]) {
    if (!Array.isArray(productos)) {
      this.logger.error('Error: productos no es un array:', productos);
      return productos;
    }

    let cuotas = this.cuotasCache;
    const now = Date.now();

    if (!cuotas || now - this.cuotasCacheTimestamp > this.CUOTAS_CACHE_TTL) {
      cuotas = await this.productReadRepository.query(
        'SELECT * FROM cuota ORDER BY cuota',
      );
      this.cuotasCache = cuotas;
      this.cuotasCacheTimestamp = now;
    }

    return productos.map((producto: any) => {
      const precioContado = parseFloat(producto.precioContado);
      let precioContadoRedondeado = precioContado;
      if (precioContado % 1000 !== 0) {
        precioContadoRedondeado = Math.ceil(precioContado / 1000) * 1000;
      }

      const cuotasCalculadas = cuotas.map((cuota: any) => {
        const cuotaNumero = cuota.cuota;
        const incremento = parseFloat(cuota.incremento);
        let precioConRecargo =
          precioContadoRedondeado +
          (precioContadoRedondeado * incremento) / 100;

        if (precioConRecargo % 1000 !== 0) {
          precioConRecargo = Math.ceil(precioConRecargo / 1000) * 1000;
        }

        return {
          cuota: cuotaNumero,
          incremento: incremento,
          precio: precioConRecargo,
          precioFormateado: precioConRecargo.toFixed(0),
        };
      });

      return {
        ...producto,
        precioContado: precioContadoRedondeado,
        precioContadoRedondeado: precioContadoRedondeado,
        cuotas: cuotasCalculadas,
      };
    });
  }

  processIntelligentSearch(searchQuery: string): {
    nombre: string;
    marca: string | null;
    categoria: string | null;
    searchTerms: string[];
    exactMatch: boolean;
  } {
    if (!searchQuery || typeof searchQuery !== 'string') {
      return {
        nombre: '',
        marca: null,
        categoria: null,
        searchTerms: [],
        exactMatch: false,
      };
    }

    const cleanedQuery = searchQuery.trim().toLowerCase();
    const searchTerms = this.expandSearchTerms(cleanedQuery);

    let nombre = cleanedQuery;
    const numericRegex = /^\d+$/;
    let exactMatch = false;
    let detectedBrand: string | null = null;
    let detectedCategory: string | null = null;

    if (numericRegex.test(cleanedQuery)) {
      
      nombre = cleanedQuery;
    } else {
      const exactMatchRegex = /"([^"]+)"/;
      exactMatch = exactMatchRegex.test(cleanedQuery);

      detectedBrand = this.detectBrand(cleanedQuery);
      detectedCategory = this.detectCategory(cleanedQuery);

      if (exactMatch) {
        nombre = exactMatchRegex.exec(cleanedQuery)?.[1] || cleanedQuery;
      } else {
        if (detectedBrand) {
          nombre = nombre.replace(new RegExp(detectedBrand, 'gi'), '').trim();
        }
        if (detectedCategory) {
          nombre = nombre
            .replace(new RegExp(detectedCategory, 'gi'), '')
            .trim();
        }
      }
    }

    return {
      nombre,
      marca: detectedBrand,
      categoria: detectedCategory,
      searchTerms,
      exactMatch,
    };
  }

  private expandSearchTerms(query: string): string[] {
    const terms = [query];
    for (const [category, synonyms] of Object.entries(this.SEARCH_SYNONYMS)) {
      if (synonyms.some((synonym) => query.includes(synonym))) {
        terms.push(...synonyms);
      }
    }

    for (const [brand, variations] of Object.entries(this.BRAND_VARIATIONS)) {
      if (variations.some((variation) => query.includes(variation))) {
        terms.push(...variations);
      }
    }

    return [...new Set(terms)];
  }

  private detectBrand(query: string): string | null {
    for (const [brand, variations] of Object.entries(this.BRAND_VARIATIONS)) {
      if (variations.some((variation) => query.includes(variation))) {
        return brand;
      }
    }
    return null;
  }

  private detectCategory(query: string): string | null {
    for (const [category, synonyms] of Object.entries(this.SEARCH_SYNONYMS)) {
      if (synonyms.some((synonym) => query.includes(synonym))) {
        return category;
      }
    }
    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  filterProductsBySearch(
    products: any[],
    searchParams: {
      nombre: string;
      marca: string | null;
      categoria: string | null;
      searchTerms: string[];
      exactMatch: boolean;
    },
  ): any[] {
    if (
      !searchParams.nombre &&
      !searchParams.marca &&
      !searchParams.categoria
    ) {
      return products;
    }

    return products.filter((product) => {
      let matchesNombre = true;
      let matchesMarca = true;
      let matchesCategoria = true;

      if (searchParams.nombre) {
        const productName = (product.nombre_articulo || '').toLowerCase();
        const productCode = String(product.codigo_articulo || '').toLowerCase();
        const numericRegex = /^\d+$/;

        if (numericRegex.test(searchParams.nombre)) {
          
          matchesNombre =
            productCode === searchParams.nombre ||
            productCode.includes(searchParams.nombre);
        } else if (searchParams.exactMatch) {
          matchesNombre =
            productName.includes(searchParams.nombre) ||
            productCode.includes(searchParams.nombre);
        } else {
          const nombreMatch =
            this.calculateSimilarity(searchParams.nombre, productName) > 0.6 ||
            productName.includes(searchParams.nombre);
          const codeMatch = productCode.includes(searchParams.nombre);
          const termsMatch = searchParams.searchTerms.some(
            (term) => productName.includes(term) || productCode.includes(term),
          );

          matchesNombre = nombreMatch || codeMatch || termsMatch;
        }
      }

      if (searchParams.marca) {
        const productBrand = (product.nombre_marca || '').toLowerCase();
        matchesMarca = productBrand.includes(searchParams.marca);
      }

      if (searchParams.categoria) {
        const productCategory = (product.nombre_categoria || '').toLowerCase();
        const productSubcategory = (
          product.nombre_subcategoria || ''
        ).toLowerCase();
        matchesCategoria =
          productCategory.includes(searchParams.categoria) ||
          productSubcategory.includes(searchParams.categoria);
      }

      return matchesNombre && matchesMarca && matchesCategoria;
    });
  }

  generateSearchHighlights(
    product: any,
    searchParams: {
      nombre: string;
      marca: string | null;
      categoria: string | null;
      searchTerms: string[];
    },
  ): {
    nombreHighlight: string;
    marcaHighlight: string;
    categoriaHighlight: string;
  } {
    const highlightTerm = (text: string, term: string): string => {
      if (!term) return text;
      const regex = new RegExp(`(${term})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    return {
      nombreHighlight: highlightTerm(
        product.nombre_articulo || '',
        searchParams.nombre,
      ),
      marcaHighlight: highlightTerm(
        product.nombre_marca || '',
        searchParams.marca || '',
      ),
      categoriaHighlight: highlightTerm(
        product.nombre_categoria || '',
        searchParams.categoria || '',
      ),
    };
  }

  normFiltro(value: any): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
  }

  normBusqueda(value: any): string | null {
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
    if (tok.length <= 4) return tok;
    if (/[bcdfghjklmnpqrstvwxyz]es$/i.test(tok)) {
      const base = tok.slice(0, -2);
      if (base.length >= 4) return base;
    }
    
    if (/[aeiou]s$/i.test(tok)) return tok.slice(0, -1);
    return tok;
  }

  private esJotaRow(r: any, ProductsService: any): boolean {
    return (
      Number(r?.codigo_marca) === ProductsService.JOTA_MARCA ||
      /jota/i.test(String(r?.nombre_marca ?? ''))
    );
  }

  private esConsultaJota(
    rows: any[],
    filters: any = {},
    ProductsService: any,
  ): boolean {
    const categoria = Number(filters?.categoria);
    if (
      Number.isFinite(categoria) &&
      ProductsService.JOTA_FAMILIAS.has(categoria)
    )
      return true;
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

  nowAsuncion(): { ymd: string; minutes: number; dow: number } {
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
    const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(); 
    return { ymd, minutes, dow };
  }

  hmsToMin(t: any): number | null {
    if (!t) return null;
    const [h, m] = String(t).split(':');
    const n = Number(h) * 60 + Number(m || 0);
    return Number.isFinite(n) ? n : null;
  }
  minToHm = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  addDaysYmd(ymd: string, days: number): string {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async aplicarPrioridadJota(
    res: { data: any[]; total: number },
    filters: any = {},
    ProductsService: any,
    getCachedPrismaProductos: any,
  ): Promise<{ data: any[]; total: number }> {
    const rows = Array.isArray(res.data) ? res.data : [];
    const marcaFiltro = this.normFiltro(filters?.marca);
    if (marcaFiltro || rows.length === 0) return res;
    if (!this.esConsultaJota(rows, filters, ProductsService)) return res;

    const offset = Number(filters?.offset) || 0;
    const limit = Number(filters?.limit) || rows.length;

    const dedupPrepend = (jota: any[], resto: any[]) => {
      const cods = new Set(jota.map((r) => String(r?.codigo_articulo)));
      return [
        ...jota,
        ...resto.filter((r) => !cods.has(String(r?.codigo_articulo))),
      ];
    };

    if (offset > 0) {
      const jota = rows.filter((r) => this.esJotaRow(r, ProductsService));
      if (!jota.length || jota.length === rows.length) return res;
      return {
        ...res,
        data: dedupPrepend(
          jota,
          rows.filter((r) => !this.esJotaRow(r, ProductsService)),
        ),
      };
    }

    try {
      const jotaRes = await getCachedPrismaProductos({
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
      this.logger.warn(
        `aplicarPrioridadJota falló: ${(e as any)?.message ?? e}`,
      );
      return res;
    }
  }

  async contarProductosV2(filters: any = {}, WEB_BASE_WHERE: any={}, STOCK_EXISTS: any={}): Promise<number> {
    const f = this.buildProcFilters(filters);
    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
        WHERE ${WEB_BASE_WHERE}
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND (? IS NULL
               OR TRIM(a.codigo) = ?
               OR a.codigodebarra = ?
               OR a.nombre LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%'))
          AND (? IS NULL OR ? = 0 OR ${STOCK_EXISTS})`,
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
}
