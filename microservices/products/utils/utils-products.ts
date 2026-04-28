import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../schemas/product.schemas';
import { Repository } from 'typeorm';

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
  ) {}

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

    // Check if query is a numeric product code
    let nombre = cleanedQuery;
    const numericRegex = /^\d+$/;
    let exactMatch = false;
    let detectedBrand: string | null = null;
    let detectedCategory: string | null = null;
    
    if (numericRegex.test(cleanedQuery)) {
      // For numeric codes, search both as code and as part of name
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
          nombre = nombre.replace(new RegExp(detectedCategory, 'gi'), '').trim();
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
          // For numeric searches, check exact match in codigo_articulo
          matchesNombre = productCode === searchParams.nombre || productCode.includes(searchParams.nombre);
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
}
