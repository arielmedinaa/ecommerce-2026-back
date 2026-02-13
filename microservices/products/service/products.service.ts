import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Product } from '@products/schemas/product.schema';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Combos } from '@products/schemas/combos.schema';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Combos.name) private readonly combosModel: Model<Combos>,
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

    const query: any = { 
      estado: { $ne: 0 },
      imagenes: { $exists: true, $ne: [] },
      dias_ultimo_movimiento: { $lte: 30 }
    };
    if (filters.categoria) query['categorias._id'] = filters.categoria;
    if (filters.subcategoria) query['subcategorias._id'] = filters.subcategoria;

    if (filters.precioMin || filters.precioMax) {
      if (filters.precioMin) query.venta.$gte = Number(filters.precioMin);
      if (filters.precioMax) query.venta.$lte = Number(filters.precioMax);
    }

    if (filters.search) {
      query.$or = [
        { codigo: filters.search },
      ];
    }

    if (filters.nombre) {
      query.nombre = { $regex: filters.nombre, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .sort({ prioridad: -1, _id: 1 })
        .skip(Number(filters.offset) || 0)
        .limit(Number(filters.limit) || 20)
        .lean(),
      this.productModel.countDocuments(query),
    ]);

    if (this.productosCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.productosCache.keys().next().value;
      this.productosCache.delete(oldestKey);
    }

    this.productosCache.set(cacheKey, { data, total, timestamp: now });
    return { data, total };
  }

  async findAll(
    filters: any = {},
  ): Promise<{ data: Product[]; total: number }> {
    return this.getCachedProductos(filters);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel
      .findOne({
        _id: id,
        estado: { $ne: 0 },
        imagenes: { $exists: true, $ne: [] },
        dias_ultimo_movimiento: { $lte: 30 }
      })
      .lean();

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product as Product;
  }

  async findByCode(codigo: string): Promise<Product | null> {
    return this.productModel.findOne({ 
      codigo, 
      estado: { $ne: 0 },
      imagenes: { $exists: true, $ne: [] },
      dias_ultimo_movimiento: { $lte: 30 }
    }).lean();
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel({
      ...createProductDto,
      estado: 1,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    });
    this.invalidateCache();
    return createdProduct.save();
  }

  async update(
    id: string,
    updateProductDto: CreateProductDto,
  ): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { ...updateProductDto, fecha_actualizacion: new Date() },
        { new: true },
      )
      .lean();

    if (!updatedProduct) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    this.invalidateCache();
    return updatedProduct as Product;
  }

  async searchProducts(
    filters: any = {},
  ): Promise<{ data: Product[]; total: number }> {
    const query = {
      nombre: { $regex: filters.search, $options: 'i' },
      estado: 1,
      web: 1,
      imagenes: { $exists: true, $ne: [] },
      dias_ultimo_movimiento: { $lte: 30 }
    };

    const total = await this.productModel.countDocuments(query);
    const productos = await this.productModel
      .find(query)
      .sort({ prioridad: -1, _id: 1 })
      .limit(total === 1 ? 1 : 4)
      .lean();

    return { data: productos as Product[], total };
  }

  async getProductsByCategory(
    categoryId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const query = { 
      'categorias._id': categoryId, 
      estado: 1, 
      web: 1,
      imagenes: { $exists: true, $ne: [] },
      dias_ultimo_movimiento: { $lte: 30 }
    };
    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .sort({ prioridad: -1, _id: 1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .lean(),
      this.productModel.countDocuments(query),
    ]);
    return { data, total };
  }

  async findByIds(ids: string[], fields?: string, filters: any = {}) {
    if (!ids || ids.length === 0) return [];
    const now = Date.now();

    const projection = fields
      ? fields
          .split(',')
          .reduce((acc, field) => ({ ...acc, [field.trim()]: 1 }), {
            _id: 0,
            codigo: 1,
          })
      : { _id: 0, codigo: 1 };

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
      productosDB = await this.productModel
        .find(
          { 
            codigo: { $in: codigosFaltantes }, 
            estado: { $ne: 0 },
            imagenes: { $exists: true, $ne: [] },
            dias_ultimo_movimiento: { $lte: 30 }
          },
          projection,
        )
        .sort({ prioridad: -1, _id: 1 })
        .lean();

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
    const filtro: any = {
      codigo,
      estado: 1,
      precio: { $gt: 9000 },
      imagenes: { $size: { $gt: 0 } },
      web: 1,
      $or: [
        { cantidad: { $gt: 0 }, dias_ultimo_movimiento: { $lte: 30 } },
        { cantidad: 0, dias_ultimo_movimiento: { $lt: 30 } }
      ]
    }
    return this.combosModel
      .findOne(filtro)
      .lean();
  }

  async getCategories(): Promise<{ categorias: string[] }> {
    try {
      const pipeline: any[] = [
        { $unwind: '$categorias' },
        { $group: { _id: '$categorias' } },
        { $sort: { _id: 1 } },
        { $limit: 20 },
        { $project: { _id: 0, categoria: '$_id' } },
      ];

      const result = await this.productModel.aggregate(pipeline).exec();
      const categorias = result.map((item) => item.categoria);
      
      return { categorias };
    } catch (error) {
      this.logger.error('Error al obtener categorías:', error);
      return { categorias: [] };
    }
  }
}
