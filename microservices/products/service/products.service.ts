import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import {
  PrismaClient,
  Product as PrismaProduct,
  Combo as PrismaCombo,
} from '@prisma/client';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';

type Product = PrismaProduct;
type Combo = PrismaCombo;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly promosService: PromosService,
  ) {}

  private productosCache = new Map<
    string,
    { data: Product[]; timestamp: number; total: number }
  >();
  private productoPorCodigoCache = new Map<
    string,
    { data: any; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly PRODUCT_CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE_ENTRIES = 50;

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
    });
  }

  invalidateCache(): void {
    this.productosCache.clear();
    this.productoPorCodigoCache.clear();
  }

  private async getCachedProductos(
    filters: any = {},
  ): Promise<{ data: Product[]; total: number }> {
    const cacheKey = this.getCacheKey(filters);
    const now = Date.now();
    const cached = this.productosCache.get(cacheKey);

    if (cached && now - cached.timestamp <= this.CACHE_TTL) {
      return { data: cached.data, total: cached.total };
    }

    const where: any = {
      activo: true,
      baja: false,
    };

    if (filters.search) {
      where.codigo = { contains: filters.search };
    }

    if (filters.codigo) {
      where.codigo = filters.codigo;
    }

    if (filters.nombre) {
      where.nombre = {
        contains: filters.nombre,
        mode: 'insensitive',
      };
    }

    if (filters.familia) {
      where.familia = filters.familia;
    }

    if (filters.proveedor) {
      where.proveedor = filters.proveedor;
    }

    if (filters.web !== undefined) {
      where.web = filters.web === '1' ? 1 : 0;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: Number(filters.offset) || 0,
        take: Number(filters.limit) || 20,
      }),
      this.prisma.product.count({ where }),
    ]);

    if (this.productosCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.productosCache.keys().next().value;
      this.productosCache.delete(oldestKey);
    }

    this.productosCache.set(cacheKey, {
      data: data as unknown as Product[],
      total,
      timestamp: now,
    });
    return { data: data as unknown as Product[], total };
  }

  async findAll(
    filters: any = {},
  ): Promise<{ data: Product[]; total: number }> {
    return this.getCachedProductos(filters);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: String(parseInt(id)),
        estado: { not: 0 },
        dias_ultimo_movimiento: { lte: 30 },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async findByCode(codigo: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        codigo,
        activo: true,
        baja: false,
      },
    });
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = await this.prisma.product.create({
      data: {
        ...createProductDto,
        estado: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    this.invalidateCache();
    return createdProduct;
  }

  async createCombo(createCombo: CreateComboDto): Promise<Combo> {
    const createdCombo = await this.prisma.combo.create({
      data: {
        ...createCombo,
        ruta: 'combo-default-route',
        descripcion: createCombo.descripcion || 'Combo description',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return createdCombo;
  }

  async update(
    id: string,
    updateProductDto: CreateProductDto,
  ): Promise<Product> {
    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id: String(parseInt(id)) },
        data: {
          ...updateProductDto,
          updatedAt: new Date(),
        },
      });

      this.invalidateCache();
      return updatedProduct;
    } catch (error) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
  }

  async searchProducts(
    filters: any = {},
  ): Promise<{ data: Product[]; total: number }> {
    const where: any = {
      nombre: {
        contains: filters.search,
        mode: 'insensitive' as const,
      },
      estado: 1,
      web: 1,
      dias_ultimo_movimiento: { lte: 30 },
    };

    const total = await this.prisma.product.count({ where });
    const productos = await this.prisma.product.findMany({
      where,
      orderBy: [{ prioridad: 'desc' }, { id: 'asc' }],
      take: total === 1 ? 1 : 4,
    });

    return { data: productos, total };
  }

  async getProductsByCategory(
    categoryId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const where: any = {
      estado: 1,
      web: 1,
      dias_ultimo_movimiento: { lte: 30 },
    };

    // Simplified category filter for MariaDB
    if (categoryId) {
      where.categorias = {
        contains: categoryId,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ prioridad: 'desc' }, { id: 'asc' }],
        skip: Number(offset),
        take: Number(limit),
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  async getProductsJota() {
    const where: any = {
      nombre: {
        contains: 'jota',
        mode: 'insensitive' as const,
      },
      estado: 1,
      web: 1,
      dias_ultimo_movimiento: { lte: 30 },
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          nombre: true,
          precio: true,
          venta: true,
          ruta: true,
          codigo: true,
          imagenes: true,
          categorias: true,
          descuento: true,
        },
        orderBy: [{ prioridad: 'desc' }, { id: 'asc' }],
        take: 10,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  async findByIds(ids: string[], fields?: string, filters: any = {}) {
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
      productosDB = await this.prisma.product.findMany({
        where: {
          codigo: { in: codigosFaltantes },
          estado: { not: 0 },
          dias_ultimo_movimiento: { lte: 30 },
        },
        select,
        orderBy: [{ prioridad: 'desc' }, { id: 'asc' }],
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

  async findByPromos(filters: any = {}) {
    const promos = await this.promosService.findAll(filters);
    const codigos: string[] = promos
      .flatMap((promo: any) =>
        Array.isArray(promo.contenido?.producto)
          ? promo.contenido.producto.map((p: any) => p.codigo)
          : [],
      )
      .filter((codigo) => !!codigo);

    return this.findByIds(codigos, filters.fields, filters);
  }

  async findComboByCodigo(codigo: string) {
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

    return this.prisma.combo.findFirst({ where });
  }

  async getCategories(): Promise<{ categorias: string[] }> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          estado: 1,
        },
        select: {
          categorias: true,
        },
      });

      const allCategories = new Set<string>();
      products.forEach((product) => {
        if (product.categorias && Array.isArray(product.categorias)) {
          product.categorias.forEach((cat: any) => {
            if (cat && cat.nombre) {
              allCategories.add(cat.nombre);
            }
          });
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
