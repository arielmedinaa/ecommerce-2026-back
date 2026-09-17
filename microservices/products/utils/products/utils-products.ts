import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../../schemas/products/product.schemas';
import { ProductsSello } from '../../schemas/products/products-sello.schema';
import { Repository } from 'typeorm';
import { PromoPricingUtil } from './promo-pricing.util';
import { normalizarNombre, similitudNombres } from '../text/similitud-nombres';

export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  celulares: [
    'celular',
    'celulares',
    'smartphone',
    'smartphones',
    'móvil',
    'movil',
    'moviles',
    'phone',
    'cel',
    'telefono',
    'teléfono',
    'telefonos',
    'teléfonos',
  ],
  smartwatches: [
    'smartwatch',
    'smartwatches',
    'reloj inteligente',
    'reloj digital',
    'smart watch',
    'pulsera inteligente',
  ],
  televisores: [
    'televisor',
    'televisores',
    'tv',
    'television',
    'televisión',
    'tele',
    'smart tv',
    'smarttv',
    'led',
    'plasma',
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
    'speaker',
    'speakers',
    'equipo de sonido',
    'minicomponente',
    'radio',
    'teatro en casa',
    'home theater',
    'soundbar',
  ],
  auriculares: [
    'auricular',
    'auriculares',
    'audífono',
    'audífonos',
    'audifono',
    'audifonos',
    'cascos',
    'manos libres',
    'headphone',
    'headphones',
    'earbuds',
    'earphones',
  ],
  computadoras: [
    'laptop',
    'laptops',
    'computadora',
    'computadoras',
    'pc',
    'portátil',
    'portatil',
    'notebook',
    'notebooks',
    'netbook',
    'cpu',
  ],
  tablets: ['tablet', 'tablets', 'tableta', 'tabletta', 'tablette'],
  camaras: [
    'cámara',
    'camara',
    'cámaras',
    'camaras',
    'cámara digital',
    'camara digital',
    'cámara web',
    'camara web',
    'camera',
    'filmadora',
    'filmadoras',
  ],
  gaming: [
    'gaming',
    'gamer',
    'gaming pc',
    'gaming laptop',
    'juegos',
    'consola',
    'consolas',
    'videojuego',
    'videojuegos',
    'play',
    'playstation',
    'xbox',
    'nintendo',
  ],
  climatizacion: [
    'climatizacion',
    'climatización',
    'aire acondicionado',
    'aire',
    'split',
    'ac',
    'acondicionado',
    'climatizador',
    'ventilador',
    'ventiladores',
    'estufa',
    'estufas',
    'termocalefon',
    'termoducha',
    'termo ducha',
  ],
  refrigeracion: [
    'refrigeracion',
    'refrigeración',
    'heladera',
    'heladeras',
    'refrigerador',
    'refrigeradores',
    'nevera',
    'neveras',
    'fridge',
    'freezer',
    'freezers',
    'congelador',
    'congeladores',
    'bebedero',
    'enfriador',
    'enfriadores',
    'exhibidora',
    'exhibidoras',
    'visicooler',
    'fabricadora de hielo',
    'dispenser',
  ],
  cocinas: [
    'cocina',
    'cocinas',
    'anafe',
    'anafes',
    'horno',
    'hornos',
    'horno electrico',
    'horno eléctrico',
    'microondas',
    'campana de cocina',
    'campana',
  ],
  electrodomesticos_pequenos: [
    'electrodomestico',
    'electrodomésticos',
    'electrodomesticos',
    'licuadora',
    'licuadoras',
    'batidora',
    'batidoras',
    'tostadora',
    'tostadoras',
    'cafetera',
    'cafeteras',
    'hervidora',
    'hervidoras',
    'pava electrica',
    'plancha',
    'planchas',
    'freidora',
    'freidoras',
    'freidora de aire',
    'air fryer',
    'sandwichera',
    'multiprocesadora',
    'exprimidor',
    'exprimidoras',
  ],
  lavado_limpieza: [
    'lavarropas',
    'lavadora',
    'lavadoras',
    'secarropas',
    'secadora',
    'secadoras',
    'lavavajillas',
    'aspiradora',
    'aspiradoras',
    'enceradora',
    'centrifugadora',
    'centrifugadoras',
    'limpiador a vapor',
  ],
  salud_belleza: [
    'afeitadora',
    'afeitadoras',
    'secador de pelo',
    'secadores de pelo',
    'plancha de pelo',
    'planchita',
    'planchitas',
    'ondulador',
    'depiladora',
    'masajeador',
    'nebulizador',
    'tomapresion',
    'toma de presion',
    'balanza',
    'perfume',
    'perfumes',
    'cortapelo',
    'cortapelos',
  ],
  muebles_camas_colchones: [
    'cama',
    'camas',
    'colchon',
    'colchón',
    'colchones',
    'sommier',
    'base',
    'box',
    'ropero',
    'roperos',
    'placard',
    'placares',
    'mueble',
    'muebles',
    'estante',
    'estantes',
    'silla',
    'sillas',
    'sillon',
    'sillón',
    'mesa',
    'mesas',
    'escritorio',
  ],
  bazar: [
    'bazar',
    'olla',
    'ollas',
    'termo',
    'termos',
    'vaso termico',
    'vasos termicos',
    'cubierto',
    'cubiertos',
    'sarten',
    'sartenes',
    'pirex',
    'juego de sabanas',
    'sabanas',
    'almohada',
    'almohadas',
    'edredon',
    'edredones',
  ],
  bebes_ninos: [
    'bebe',
    'bebé',
    'bebes',
    'bebés',
    'niño',
    'niños',
    'cuna',
    'cunas',
    'corralito',
    'corralitos',
    'carrito',
    'carritos',
    'baby seat',
    'bicicleta',
    'bicicletas',
    'juguete',
    'juguetes',
    'triciclo',
    'triciclos',
    'andador',
  ],
  indumentaria: [
    'indumentaria',
    'ropa',
    'remera',
    'remeras',
    'camiseta',
    'camisetas',
    'campera',
    'camperas',
    'pantalon',
    'pantalón',
    'pantalones',
    'calzado',
    'calzados',
    'zapatilla',
    'zapatillas',
    'medias',
    'short',
    'shorts',
  ],
  jardin_herramientas: [
    'jardin',
    'jardín',
    'herramienta',
    'herramientas',
    'taladro',
    'taladros',
    'amoladora',
    'motosierra',
    'motosierras',
    'bordeadora',
    'bordeadoras',
    'cortacesped',
    'cortacésped',
    'desmalezadora',
    'desmalezadoras',
    'hidrolavadora',
    'hidrolavadoras',
    'generador',
    'generadores',
    'compresor',
    'piscina',
    'piscinas',
    'parrilla',
    'parrillas',
  ],
  automotor: [
    'automotor',
    'automovil',
    'automóvil',
    'bateria',
    'batería',
    'baterias',
    'cubierta',
    'cubiertas',
    'neumatico',
    'neumático',
    'neumaticos',
  ],
};

/**
 * Pares/grupos de categorías que deben mezclarse aunque no compartan palabra
 * literal. La mayoría de los casos reales (parlante/speaker, heladera/freezer,
 * cama/colchon) ya quedan cubiertos porque viven en el mismo grupo de
 * CATEGORY_SYNONYMS de arriba. Esta estructura queda para relacionar grupos
 * *distintos* entre sí (ej. quien busca "cocina" probablemente también
 * quiera electrodomésticos pequeños de cocina).
 */
export const RELATED_CATEGORY_TERMS: Record<string, string[]> = {
  cocinas: ['electrodomesticos_pequenos'],
  electrodomesticos_pequenos: ['cocinas'],
  climatizacion: ['refrigeracion'],
  refrigeracion: ['climatizacion'],
};

/**
 * Catálogo real de marcas (tabla `marca` del ERP, ssss_emp1) — usado para
 * matchear tokens con errores de tipeo contra el nombre canónico de marca.
 * No se lista a mano variante por variante: se compara por similitud
 * (bigramas + Levenshtein) en detectBrandToken.
 */
export const MARCAS_CATALOGO: string[] = [
  'ABBA', 'ACER', 'ADIDAS', 'AIWA', 'ALTEZZA', 'ALUSTEP', 'AMAZFIT', 'AMAZON',
  'ANNECY', 'ANODILAR', 'ANTONIO BANDERAS', 'AOC', 'AORUS', 'APPLE', 'ARACEBA',
  'ARIETE', 'ARISTON', 'ARMANI', 'ARNO', 'ASPEN', 'ASUS', 'ATHLETIC',
  'ATLANTIC', 'ATLAS', 'AUX', 'AXXIS', 'BABYLISS', 'BANDEIRANTE', 'BEBE MUNDO',
  'BEKO', 'BELLISIMA', 'BELLISIMA CUBOX', 'BERTOLINI', 'BESTWAY', 'BIANCHI',
  'BLACK + DECKER', 'BLACK COOLTURE', 'BLAUPUNKT', 'BOMDER', 'BOSCH',
  'BRAESI', 'BRIKET', 'BRITANIA', 'BROTHER', 'BUBBA', 'BURIGOTTO', 'CADENCE',
  'CALOI', 'CALVIN KLEIN', 'CANDY', 'CANGREJO COMERCIAL', 'CAROLINA HERRERA',
  'CARRIER', 'CASIO', 'CBC', 'CBC MUEBLES', 'CHACOMER', 'CHICCO', 'CHUWI',
  'COBRASA', 'COEXMA', 'COLEMAN', 'COMFEE', 'COMPASAL', 'CONSUL', 'CONSUMER',
  'CONTIGO', 'CONTINENTAL', 'CONVERSE', 'CORTAG MASTER', 'CRAL', 'CREARTE',
  'CROCS', 'CROIX', 'DAEWOO', 'DAKO', 'DECOTEAM', 'DELONGHI', 'DIOR', 'DREAN',
  'DUCATI', 'DUENDE', 'DUNLOP', 'ECOLEATHER', 'ECOPOWER', 'ECOSILKON',
  'ELECTROBRASS', 'ELECTROLUX', 'ELECTRONIX', 'ELEGANCY HOUSE', 'EMPOLI',
  'EMPOT', 'EMTOP', 'ENVAPAR', 'ENXUTA', 'EPSON', 'ESLABON DE LUJO',
  'EVOLUTION', 'FAMA', 'FASCY', 'FASTRAX', 'FERZA', 'FICON', 'FILA',
  'FIR ION', 'FISHER', 'FLEX NEO', 'FRARE', 'FRICON', 'FRIDER', 'FRILUX',
  'FTX', 'G.PANIZ', 'GA.MA', 'GAMMA', 'GARDEX', 'GARTHEN', 'GASTROMAQ',
  'GEISHA', 'GELOPAR', 'GEMSY', 'GENERAL ELECTRIC', 'GEORGE FOREMAN',
  'GIGABYTE', 'GLOBAL', 'GOODWEATHER', 'GOODYEAR', 'HAMILTON BAECH',
  'HAUSTEC', 'HAYLOU', 'HISENSE', 'HOGAR DULCE HOGAR', 'HONEYWELL', 'HONOR',
  'HP', 'HUAWEI', 'HUSQUARNA', 'HYDRATE', 'HYPERX', 'HYUNDAI', 'IBBL',
  'IGLOO', 'IMPERIO HOGAR', 'IMUSA', 'INDIO', 'INELRO', 'INFINIX', 'INMAPOL',
  'INTERBRAS', 'INTEX', 'INVERFIN', 'ITALUX', 'ITATAITA', 'ITATIAIA', 'JACK',
  'JADEVER', 'JAGUAR', 'JAM', 'JAMES', 'JBL', 'JOTA', 'JUGUETERIA FERZA',
  'JUGUETERIA ME ENCANTA', 'JUGUETONES', 'JVC', 'KARCHER', 'KDK', 'KENDA',
  'KENOK', 'KENWOOD', 'KIESLECT', 'KIN', 'KINGSTON', 'KITCHENAID', 'KLIP',
  'KOALA', 'KODAK', 'KOLKE', 'KRUPS', 'KUMHO', 'KUMTEL',
  'LA HORA DE LAS COMPRAS', 'LATINA', 'LENOVO', 'LEVEL', 'LG', 'LIDER',
  'LINGLONG', 'LOGITECH', 'LORENSID', 'LORENZETTI', 'LORUS', 'LUO', 'LUXELL',
  'MABE', 'MACIZO', 'MADEMSA', 'MAKITA', 'MALLORY', 'MALTA', 'MANANTIAL',
  'MATSUI', 'MAYTAG', 'MECAL MUEBLES', 'MEGA STAR', 'MEMO', 'META',
  'META SPORTS', 'METALCUBAS', 'METALMEC', 'METALPLAST', 'METALÚRGICA JUANK',
  'METVISA', 'MICHELIN', 'MIDAS', 'MIDEA', 'MILANO', 'MONARK', 'MONDIAL',
  'MONTREAL', 'MOR', 'MOTOROLA', 'MOULINEX', 'MOURA', 'MOVEL MAX', 'MSA',
  'MUEBLERIA ADRI', 'MUEBLERIA JYM', 'MUEBLERIA MATI', 'MUEBLES ZORRILLA',
  'MUELLER', 'MUG TRAVEL', 'MULTILASER', 'MY BABY', 'NAPPO', 'NAUTICA',
  'NEWMAQ', 'NEXXT', 'NIKE', 'NILANT', 'NOGAL', 'NOKIA', 'OPPO', 'ORAIMO',
  'OSTER', 'PANASONIC', 'PANEX', 'PANTUM', 'PARANA', 'PARLUX', 'PEABODY',
  'PENALTY', 'PETERSEN', 'PETRYCOSKI', 'PHILIPS', 'PILAR', 'PIONEER',
  'PIRELLI', 'POLITORNO', 'PROGAS', 'PUMA', 'QUANTA', 'QUICK',
  'RAMAD MUEBLES', 'REALCE', 'REMINGTON', 'REVLON', 'RGA', 'RHEEM',
  'ROCHEDO', 'ROWENTA', 'SALLUSTRO', 'SAMSONITE', 'SAMSUNG', 'SATE',
  'SCHULZ', 'SCOTT', 'SEVERIN', 'SHIRO', 'SILTAL', 'SINGER', 'SKIL', 'SKY',
  'SONIC', 'SONY', 'SPEED', 'SPOLU', 'SPORTOP', 'STANLEY', 'STAR', 'STIHL',
  'SUEÑOLAR', 'SUPER SPUMA', 'SUPERCHAMP', 'SYMPHONY', 'SYOPAR', 'TAIFF',
  'TAP CACERES', 'TAPICERIA VALDEZ', 'TARAMPS', 'TCL', 'TECNO',
  'TECNO SPARK', 'TECNOFITNESS', 'TEDESCO', 'TENSEI', 'TERRANO', 'THRIVE',
  'TITA', 'TOKYO', 'TOMMY HILFIGER', 'TOSHIBA', 'TOTAL', 'TOYOTA', 'TRACK',
  'TRAMONTINA', 'TRAPP', 'TRUPER', 'UFESA', 'UGUR', 'UMBRO', 'UNANIME',
  'UNDER ARMOUR', 'UNIQUE', 'VALCO', 'VANS', 'VARTA', 'VCP', 'VELOZ',
  'VENANCIO', 'VITA COSMETICOS', 'VIZIO', 'VOLCAN', 'WAHL', 'WAHSON',
  'WANBO', 'WANKEE', 'WAP', 'WASKO', 'WESTINGHOUSE', 'WESTMAN', 'WESTPOINT',
  'WHIRLPOOL', 'WILLPEX', 'WIN', 'WORKSAFE', 'XBRI', 'XIAOMI', 'XINJI',
  'XION', 'XTECH', 'YORK', 'ZENSEI', 'ZTE', 'BEURER', 'PUREGEAR',
];

/**
 * Casos puntuales de errores de tipeo que la comparación por similitud
 * (bigramas/Levenshtein) no llega a cubrir por sí sola (nombre corto,
 * varias letras distintas). Se agregan a mano acá según se reporten.
 */
export const BRAND_VARIATIONS: Record<string, string[]> = {
  goodweather: [
    'goodweather',
    'good weather',
    'gudwater',
    'goodweater',
    'gud weather',
    'good weater',
  ],
  samsung: ['samsung', 'samsumg', 'samsun'],
  xiaomi: ['xiaomi', 'redmi', 'mi'],
  apple: ['apple', 'iphone', 'ipad', 'imac'],
  motorola: ['motorola', 'moto'],
};

/**
 * Frases naturales completas → intención de búsqueda (subcategoría real +
 * keywords). Set chico y curado, arrancando con los ejemplos que dio el
 * usuario; agregar más acá a futuro.
 */
export const PHRASE_INTENTS: {
  phrase: string;
  categoriaGroup: string;
  keywords: string[];
}[] = [
  {
    phrase: 'cama para dos personas',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['matrimonial', '190', '160', '2 plazas', 'queen'],
  },
  {
    phrase: 'cama matrimonial',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['matrimonial', '190', '160', '2 plazas', 'queen'],
  },
  {
    phrase: 'cama de matrimonio',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['matrimonial', '190', '160', '2 plazas', 'queen'],
  },
  {
    phrase: 'cama para una persona',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['1 plaza', '90', 'juvenil', 'individual'],
  },
  {
    phrase: 'cama individual',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['1 plaza', '90', 'juvenil', 'individual'],
  },
  {
    phrase: 'cama queen',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['queen', '160'],
  },
  {
    phrase: 'cama king',
    categoriaGroup: 'muebles_camas_colchones',
    keywords: ['king', '200'],
  },
  {
    phrase: 'aire acondicionado frio calor',
    categoriaGroup: 'climatizacion',
    keywords: ['frio calor', 'frío calor'],
  },
];

@Injectable()
export class ProductsUtils {
  private readonly logger = new Logger(ProductsUtils.name);
  private cuotasCache: any[] | null = null;
  private cuotasCacheTimestamp: number = 0;
  private readonly CUOTAS_CACHE_TTL = 10 * 60 * 1000;
  private readonly TICKET_CUOTAS_RANGOS = [
    { montoDesde: 0, montoHasta: 500000, cuotaMin: 3, cuotaMax: 6 },
    { montoDesde: 500001, montoHasta: 1500000, cuotaMin: 6, cuotaMax: 9 },
    { montoDesde: 1500001, montoHasta: 2000000, cuotaMin: 6, cuotaMax: 12 },
    { montoDesde: 2000001, montoHasta: 2500000, cuotaMin: 6, cuotaMax: 15 },
    { montoDesde: 2500001, montoHasta: 3000000, cuotaMin: 6, cuotaMax: 15 },
    { montoDesde: 3000001, montoHasta: 3500000, cuotaMin: 6, cuotaMax: 18 },
    { montoDesde: 3500001, montoHasta: null, cuotaMin: 6, cuotaMax: 18 },
  ];

  private filtrarCuotasPorTicket(cuotas: any[], monto: number) {
    const rango = this.TICKET_CUOTAS_RANGOS.find(
      (r) => monto >= r.montoDesde && (r.montoHasta === null || monto <= r.montoHasta),
    );
    if (!rango) return cuotas;
    return cuotas.filter(
      (c: any) =>
        c.cuota === 0 || (c.cuota >= rango.cuotaMin && c.cuota <= rango.cuotaMax),
    );
  }

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

  async complementosDisponibles(
    candidatos: string[],
    WEB_BASE_WHERE: any,
    cache: any,
    CACHE_TTL: any,
    STOCK_EXISTS: any,
  ): Promise<string[]> {
    const unicos = [
      ...new Set(candidatos.map((c) => String(c || '').trim()).filter(Boolean)),
    ];
    if (unicos.length === 0) return [];

    const disponible = new Map<string, boolean>();
    const pendientes: string[] = [];
    for (const termino of unicos) {
      const cacheKey = `complemento-existe:${termino.toLowerCase()}`;
      const cached = await cache.get(cacheKey);
      if (cached != null) {
        disponible.set(termino, !!cached);
      } else {
        pendientes.push(termino);
      }
    }

    if (pendientes.length > 0) {
      try {
        const unionSql = pendientes
          .map(
            (_, i) =>
              `SELECT ${i} AS idx, EXISTS (
                 SELECT 1 FROM articulo a
                 LEFT JOIN subfamilia sf ON sf.codigo = a.subfamilia
                 WHERE ${WEB_BASE_WHERE} AND ${STOCK_EXISTS}
                   AND (a.nombre LIKE ? OR sf.nombre LIKE ?)
               ) AS existe`,
          )
          .join(' UNION ALL ');
        const params = pendientes.flatMap((termino) => {
          const like = `%${termino}%`;
          return [like, like];
        });
        const rows = await this.productReadRepository.query(unionSql, params);
        for (const row of rows) {
          const termino = pendientes[Number(row.idx)];
          const existe = !!Number(row.existe);
          disponible.set(termino, existe);
          await cache.set(
            `complemento-existe:${termino.toLowerCase()}`,
            existe,
            CACHE_TTL,
          );
        }
      } catch (e) {
        this.logger.error(
          'Error chequeando disponibilidad de complementos:',
          e,
        );
        for (const termino of pendientes) disponible.set(termino, false);
      }
    }

    return unicos.filter((t) => disponible.get(t));
  }

  async aplicarPreciosPromo(products: any[]): Promise<any[]> {
    if (!Array.isArray(products) || products.length === 0) return products;

    const codigos = products.map((p: any) => p.codigo_articulo);
    const promoMap =
      await this.promoPricingUtil.getPromoInfoForCodigos(codigos);
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
          promo.contado !== null
            ? promo.contado
            : product.precioventaRedondeado,
        precioventa:
          promo.contado !== null ? promo.contado : product.precioventa,
        preciotope:
          promo.original !== null ? promo.original : product.preciotope,
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
    const promoMap =
      await this.promoPricingUtil.getPromoInfoForCodigos(codigos);
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
          promo.contado !== null
            ? promo.contado
            : producto.precioContadoRedondeado,
        precioContado:
          promo.contado !== null ? promo.contado : producto.precioContado,
        precioCredito:
          promo.contado !== null ? promo.contado : producto.precioCredito,
        precioOriginal:
          promo.original !== null ? promo.original : producto.precioOriginal,
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
        cuotas: this.filtrarCuotasPorTicket(cuotasCalculadas, precioVentaRedondeado),
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
        cuotas: this.filtrarCuotasPorTicket(cuotasCalculadas, precioContadoRedondeado),
      };
    });
  }

  /**
   * Expande una búsqueda cruda en hasta 4 términos alternos: el original,
   * su variante sin acentos/lowercase (normalizarNombre — cubre cualquier
   * typo de tilde aunque no esté en ningún diccionario), sinónimos de
   * categoría/subcategoría real del catálogo, marca canónica si detecta un
   * token con error de tipeo, y coincidencia de frase completa (PHRASE_INTENTS).
   * Función pura: no toca la base de datos.
   */
  expandBusquedaTerms(rawQuery: string): {
    terms: string[];
    categoriaHint?: string;
  } {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return { terms: [] };
    }

    const original = rawQuery.trim();
    if (!original) return { terms: [] };

    const normalizado = normalizarNombre(original);
    const terms: string[] = [original];
    if (normalizado && normalizado !== original.toLowerCase()) {
      terms.push(normalizado);
    }

    let categoriaHint: string | undefined;

    // 1) Frase completa → intención curada (cama matrimonial, etc.)
    for (const intent of PHRASE_INTENTS) {
      const intentNorm = normalizarNombre(intent.phrase);
      if (
        normalizado === intentNorm ||
        normalizado.includes(intentNorm) ||
        similitudNombres(normalizado, intentNorm) >= 0.7
      ) {
        categoriaHint = categoriaHint ?? intent.categoriaGroup;
        for (const kw of intent.keywords) {
          if (!terms.includes(kw)) terms.push(kw);
        }
        break;
      }
    }

    // 2) Categoría/subcategoría por sinónimo (+ grupos relacionados)
    if (terms.length < 4) {
      for (const [group, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
        const matched = synonyms.some(
          (syn) => normalizado.includes(normalizarNombre(syn)),
        );
        if (!matched) continue;
        categoriaHint = categoriaHint ?? group;
        const gruposAAgregar = [group, ...(RELATED_CATEGORY_TERMS[group] ?? [])];
        for (const g of gruposAAgregar) {
          for (const syn of CATEGORY_SYNONYMS[g] ?? []) {
            if (terms.length >= 4) break;
            if (!terms.includes(syn)) terms.push(syn);
          }
        }
        break;
      }
    }

    // 3) Marca por token (curada primero, luego fuzzy contra el catálogo real)
    if (terms.length < 4) {
      const marca = this.detectBrandToken(normalizado);
      if (marca && !terms.includes(marca)) terms.push(marca);
    }

    return { terms: terms.slice(0, 4), categoriaHint };
  }

  /**
   * Busca un token de marca dentro de la query normalizada: primero contra
   * las variantes curadas a mano (BRAND_VARIATIONS, casos que el fuzzy no
   * cubre por tener distancia de edición alta), y si no matchea, por
   * similitud (bigramas + primera letra) contra MARCAS_CATALOGO (marcas
   * reales del ERP).
   */
  private detectBrandToken(normalizado: string): string | null {
    for (const [canonico, variantes] of Object.entries(BRAND_VARIATIONS)) {
      if (variantes.some((v) => normalizado.includes(normalizarNombre(v)))) {
        return canonico;
      }
    }

    const tokens = normalizado.split(' ').filter((t) => t.length >= 4);
    let mejor: { marca: string; score: number } | null = null;
    for (const token of tokens) {
      for (const marca of MARCAS_CATALOGO) {
        const marcaNorm = normalizarNombre(marca);
        if (marcaNorm[0] !== token[0]) continue;
        const score = similitudNombres(token, marcaNorm);
        if (score >= 0.6 && (!mejor || score > mejor.score)) {
          mejor = { marca, score };
        }
      }
    }
    return mejor?.marca ?? null;
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

  private async esConsultaJota(
    rows: any[],
    filters: any = {},
    ProductsService: any,
  ): Promise<boolean> {
    const search = String(filters?.search ?? '').trim();
    if (search) {
      const marcaDetectada = this.detectBrandToken(normalizarNombre(search));
      if (marcaDetectada && marcaDetectada.toUpperCase() !== 'JOTA') {
        return false;
      }
    }

    // Taxonomía real de JOTA (familias/subfamilias donde tiene artículos web).
    // Si la consulta no la pudo resolver, se cae al respaldo hardcodeado.
    const taxonomia =
      typeof ProductsService.getJotaTaxonomia === 'function'
        ? await ProductsService.getJotaTaxonomia()
        : null;
    const familias: Set<number> =
      taxonomia?.familias ?? ProductsService.JOTA_FAMILIAS;

    const categoria = Number(filters?.categoria);
    if (Number.isFinite(categoria) && familias.has(categoria)) return true;

    const subcategoria = Number(
      filters?.subcategoria ?? filters?.subfamilia ?? NaN,
    );
    if (
      taxonomia &&
      Number.isFinite(subcategoria) &&
      taxonomia.subfamilias.has(subcategoria)
    ) {
      return true;
    }

    if (search) {
      // Si no hay filtro de categoría, la señal es el texto: cae en JOTA si
      // menciona alguna palabra de los nombres de su familia/subfamilia.
      if (taxonomia) {
        const buscado = normalizarNombre(search);
        const tokens = buscado.split(/\s+/).filter((t) => t.length >= 4);
        for (const tok of tokens) {
          if (
            taxonomia.terminos.some(
              (t) => t === tok || t.startsWith(tok) || tok.startsWith(t),
            )
          ) {
            return true;
          }
        }
      }
      if (ProductsService.JOTA_KEYWORDS.test(search)) return true;
    }

    // Listado sin categoría ni búsqueda: la home/catálogo general.
    if (!Number.isFinite(categoria) && !search) return true;
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
    if (!(await this.esConsultaJota(rows, filters, ProductsService)))
      return res;

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
      const jotaTodos = Array.isArray(jotaRes.data) ? jotaRes.data : [];
      if (!jotaTodos.length) return res;
      // JOTA va primero, pero no puede ocupar la página entera: el bloque se
      // topea a la mitad del limit. Sin el tope, una categoría con muchos
      // artículos JOTA llenaba la página 1 y empujaba lo realmente buscado a la
      // página 2 — y como `total` no cuenta las filas inyectadas, la
      // paginación se corría y repetía productos entre páginas.
      const tope = limit > 0 ? Math.max(4, Math.floor(limit / 2)) : jotaTodos.length;
      const jota = jotaTodos.slice(0, tope);
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

  /**
   * Condición SQL para el filtro de búsqueda libre, con OR de LIKEs sobre
   * todos los términos expandidos (parlante/speaker/etc.) para que el total
   * de paginación sea consistente con los resultados reales del proc.
   * Devuelve un fragmento con el mismo shape "(? IS NULL OR ...)" que ya
   * usaban contarProductos/contarProductosV2, para no romper la cantidad
   * de placeholders que espera cada query.
   */
  buildBusquedaSql(busqueda: string | null): { sql: string; params: any[] } {
    const terms = busqueda
      ? this.expandBusquedaTerms(busqueda).terms
      : [];
    const list = terms.length ? terms : [busqueda];
    const nameLikes = list
      .map(() => `a.nombre LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%')`)
      .join(' OR ');
    return {
      sql: `(? IS NULL OR TRIM(a.codigo) = ? OR a.codigodebarra = ? OR (${nameLikes}))`,
      params: [busqueda, busqueda, busqueda, ...list],
    };
  }

  async contarProductosV2(
    filters: any = {},
    WEB_BASE_WHERE: any = {},
    depositoIds: number[] = [],
  ): Promise<number> {
    const f = this.buildProcFilters(filters);
    const busquedaCond = this.buildBusquedaSql(f.busqueda);
    const depositoList = depositoIds.length ? depositoIds.join(',') : '-1';
    const rows = await this.productReadRepository.query(
      `SELECT COUNT(*) AS total
         FROM articulo a
         LEFT JOIN (SELECT DISTINCT codigo_articulo FROM tbl_stock_actual WHERE deposito IN (${depositoList}) AND cantidad_actual > 0) stk
           ON stk.codigo_articulo = a.codigo_articulo
        WHERE ${WEB_BASE_WHERE}
          AND (? IS NULL OR a.marca = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.familia = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.proveedor = CAST(? AS UNSIGNED))
          AND (? IS NULL OR a.precioventa >= ?)
          AND (? IS NULL OR a.precioventa <= ?)
          AND ${busquedaCond.sql}
          AND (? IS NULL OR ? = 0 OR stk.codigo_articulo IS NOT NULL)`,
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
        f.soloStock,
        f.soloStock,
      ],
    );
    return Number(rows?.[0]?.total || 0);
  }
}
