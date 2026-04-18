import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
import { Product } from '../schemas/product.schemas';
import { Combo } from '../schemas/combo.schemas';

import { ProductsUtils } from '@products/utils/utils-products';
//import { Promo } from '../schemas/promo.schemas';

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
    private readonly promosService: PromosService,
    private readonly productsUtils: ProductsUtils,
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
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE_ENTRIES = 100;
  private readonly PRODUCT_CACHE_TTL = 10 * 60 * 1000;

  private getCacheKey(filters: any): string {
    return JSON.stringify({
      limit: filters.limit,
      offset: filters.offset,
      categoria: filters.categoria,
      subcategoria: filters.subcategoria,
      precioMin: filters.precioMin,
      precioMax: filters.precioMax,
      search: filters.search,
      nombre: filters.nombre,
      marca: filters.marca,
    });
  }

  invalidateCache(): void {
    this.productosCache.clear();
    this.productoPorCodigoCache.clear();
    this.productosJotaCache.clear();
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
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce(?, ?, ?, NULL)',
      [limit, offset, filters.marca || null]
    );

    const dataWithTrimmedNames = result[0]?.map((item: any) => ({
      ...item,
      codigo_articulo: item.codigo_articulo.trim(),
      nombre_articulo: item.nombre_articulo.trim(),
      nombre_subcategoria: item.nombre_subcategoria.trim(),
      nombre_marca: item.nombre_marca.trim(),
      nombre_proveedor: item.nombre_proveedor.trim(),
      codigo_de_barra: item.codigo_de_barra.trim(),
      descripcion: item.nota.trim(),
    }));
    
    const data = dataWithTrimmedNames || [];
    const dataConCuotas = await this.productsUtils.calculoCreditoProductos(data);
    const total = dataConCuotas.length; 

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

  async findAll(filters: any = {}): Promise<{ data: any[]; total: number }> {
    return this.getCachedPrismaProductos(filters);
  }

  async findOne(codigo_articulo: string): Promise<any> {
    const product = await this.productReadRepository.findOne({
      where: { codigo_articulo },
    });

    if (!product) {
      throw new NotFoundException(
        `PrismaProducto con codigo_articulo ${codigo_articulo} no encontrado`,
      );
    }
    return product;
  }

  async findByCode(codigo: string): Promise<any | null> {
    return this.productReadRepository.findOne({
      where: {
        codigo,
      },
    });
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

  async searchPrismaProducts(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const where: any = {
      nombre: {
        contains: filters.search,
        mode: 'insensitive' as const,
      },
    };

    const total = await this.productReadRepository.count({ where });
    const productos = await this.productReadRepository.find({
      where,
      order: { codigo_articulo: 'asc' },
      take: total === 1 ? 1 : 4,
    });

    return { data: productos, total };
  }

  async getPrismaProductsByCategory(
    categoryId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const where: any = {
      estado: 1,
      web: 1,
      dias_ultimo_movimiento: { lte: 30 },
    };

    if (categoryId) {
      where.categorias = {
        contains: categoryId,
      };
    }

    const [data, total] = await Promise.all([
      this.productReadRepository.find({
        where,
        order: { codigo_articulo: 'asc' },
        skip: Number(offset),
        take: Number(limit),
      }),
      this.productReadRepository.count({ where }),
    ]);
    return { data, total };
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

  async searchProducts(
    filters: any = {},
  ): Promise<{ data: any[]; total: number }> {
    const where: any = {
      nombre: {
        contains: filters.search,
        mode: 'insensitive' as const,
      },
      estado: 1,
      web: 1,
      dias_ultimo_movimiento: { lte: 30 },
    };

    const total = await this.productReadRepository.count({ where });
    const productos = await this.productReadRepository.find({
      where,
      order: { codigo_articulo: 'asc' },
      take: total === 1 ? 1 : 4,
    });

    return { data: productos, total };
  }

  async getProductsJota(filters: any = {}): Promise<{ data: any[]; total: number }> {
    const cacheKey = this.getCacheKey({ ...filters, type: 'jota' });
    const now = Date.now();
    const cached = this.productosJotaCache.get(cacheKey);

    if (cached && now - cached.timestamp <= this.CACHE_TTL) {
      return { data: cached.data, total: cached.total };
    }

    const limit = Number(filters.limit) || 0;
    const offset = Number(filters.offset) || 0;
    
    // Usar procedure específico para JOTA con marca 257
    const result = await this.productReadRepository.query(
      'CALL proc_obtener_listado_articulos_ecommerce(?, ?, 257, NULL)',
      [limit, offset]
    );

    const dataWithTrimmedNames = result[0]?.map((item: any) => ({
      ...item,
      codigo_articulo: item.codigo_articulo.trim(),
      nombre_articulo: item.nombre_articulo.trim(),
      nombre_subcategoria: item.nombre_subcategoria.trim(),
      nombre_marca: item.nombre_marca.trim(),
      nombre_proveedor: item.nombre_proveedor.trim(),
      codigo_de_barra: item.codigo_de_barra.trim(),
      descripcion: item.nota.trim(),
    }));
    
    const data = dataWithTrimmedNames || [];
    const dataConCuotas = await this.productsUtils.calculoCreditoProductos(data);
    const total = dataConCuotas.length;

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

  async getCategories(): Promise<{ categorias: string[] }> {
    try {
      const products = await this.productReadRepository.find({
        where: {},
        select: {
          nombre: true,
        },
      });

      const allCategories = new Set<string>();
      products.forEach((product) => {
        if (product.nombre) {
          allCategories.add(product.nombre);
        }
      });

      const categorias = Array.from(allCategories).sort().slice(0, 20);
      return { categorias };
    } catch (error) {
      this.logger.error('Error al obtener categorías:', error);
      return { categorias: [] };
    }
  }
}
