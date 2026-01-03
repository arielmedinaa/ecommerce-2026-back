import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@products/schemas/product.schema';
import { PromosService } from './promos.service';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly promosService: PromosService,
  ) {}

  private productosCache = new Map<string, { data: Product[]; timestamp: number; total: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE_ENTRIES = 50; 

  private getCacheKey(filters: any): string {
    return JSON.stringify({
      limit: filters.limit,
      offset: filters.offset,
      categoria: filters.categoria,
      subcategoria: filters.subcategoria,
      precioMin: filters.precioMin,
      precioMax: filters.precioMax,
      search: filters.search
    });
  }

  private async getCachedProductos(filters: any = {}): Promise<{ data: Product[]; total: number }> {
    const cacheKey = this.getCacheKey(filters);
    const now = Date.now();
    const cached = this.productosCache.get(cacheKey);
    if (cached && now - cached.timestamp <= this.CACHE_TTL) {
      return { data: cached.data, total: cached.total };
    }

    const query: any = { estado: { $ne: 0 } };
    if (filters.categoria) query['categorias._id'] = filters.categoria;
    if (filters.subcategoria) query['subcategorias._id'] = filters.subcategoria;
    if (filters.precioMin || filters.precioMax) {
      query.venta = {};
      if (filters.precioMin) query.venta.$gte = Number(filters.precioMin);
      if (filters.precioMax) query.venta.$lte = Number(filters.precioMax);
    }
    if (filters.search) {
      query.$or = [
        { nombre: { $regex: filters.search, $options: 'i' } },
        { descripcion: { $regex: filters.search, $options: 'i' } },
        { codigo: filters.search },
      ];
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .sort({ prioridad: -1, _id: 1 })
        .skip(Number(filters.offset) || 0)
        .limit(Number(filters.limit) || 20)
        .lean(),
      this.productModel.countDocuments(query)
    ]);

    if (this.productosCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.productosCache.keys().next().value;
      this.productosCache.delete(oldestKey);
    }

    this.productosCache.set(cacheKey, {
      data,
      total,
      timestamp: now
    });

    return { data, total };
  }

  invalidateCache(): void {
    this.productosCache.clear();
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
      })
      .lean();

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async findByCode(codigo: string): Promise<Product | null> {
    return this.productModel
      .findOne({
        codigo,
        estado: { $ne: 0 },
      })
      .lean();
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel({
      ...createProductDto,
      estado: 1,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    });
    return createdProduct.save();
  }

  async update(
    id: string,
    updateProductDto: CreateProductDto,
  ): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          ...updateProductDto,
          fecha_actualizacion: new Date(),
        },
        { new: true },
      )
      .lean();

    if (!updatedProduct) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.productModel.findByIdAndUpdate(
      id,
      { estado: 0, fecha_actualizacion: new Date() },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return { success: true };
  }

  async updateStock(
    id: string,
    cantidad: number,
    operacion: 'increment' | 'decrement' = 'increment',
  ): Promise<Product> {
    const update =
      operacion === 'increment'
        ? { $inc: { cantidad } }
        : { $inc: { cantidad: -cantidad } };

    const product = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          ...update,
          fecha_actualizacion: new Date(),
          dias_ultimo_movimiento: 0,
        },
        { new: true },
      )
      .lean();

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return this.productModel
      .find({
        _id: { $in: ids },
        estado: { $ne: 0 },
      })
      .lean();
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return this.productModel
      .find({
        estado: 1,
        web: 1,
        cantidad: { $gt: 0 },
      })
      .sort({ prioridad: -1, _id: 1 })
      .limit(limit)
      .lean();
  }

  async searchProducts(filters: any = {}): Promise<{data: Product[], total: number}> {
    const query = {
      nombre: { $regex: filters.search, $options: 'i' },
      estado: 1,
      web: 1,
    };
    
    const total = await this.productModel.countDocuments(query);
    if (total === 1) {
      const [producto] = await this.productModel
        .find(query)
        .sort({ prioridad: -1, _id: 1 })
        .lean();
      return { data: [producto], total: 1 };
    }
    
    const productos = await this.productModel
      .find(query)
      .sort({ prioridad: -1, _id: 1 })
      .limit(4)
      .lean();
      
    return { data: productos, total };
  }

  async getProductsByCategory(
    categoryId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const [data, total] = await Promise.all([
      this.productModel
        .find({
          'categorias._id': categoryId,
          estado: 1,
          web: 1,
        })
        .sort({ prioridad: -1, _id: 1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .lean(),
      this.productModel.countDocuments({
        'categorias._id': categoryId,
        estado: 1,
        web: 1,
      }),
    ]);

    return { data, total };
  }

  //LOS IDS SON LOS CODIGOS DE LOS PRODUCTOS EN EL MONGO
  private productoPorCodigoCache = new Map<string, { data: any; timestamp: number }>();
  private readonly PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  private getIdsCacheKey(ids: string[], fields?: string): string {
    const sortedIds = [...ids].sort();
    return `ids:${sortedIds.join(',')}:fields:${fields || 'all'}`;
  }

  async findByIds(ids: string[], fields?: string, filters: any = {}) {
    if (!ids || ids.length === 0) return [];
    const now = Date.now();
    const projection = fields
      ? fields.split(',').reduce((acc, field) => ({ ...acc, [field.trim()]: 1 }), { _id: 0 })
      : { _id: 0 };

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
        .find({ codigo: { $in: codigosFaltantes }, estado: { $ne: 0 } }, projection)
        .sort({ prioridad: -1, _id: 1 })
        .lean();
      for (const prod of productosDB) {
        if (prod && prod.codigo) {
          this.productoPorCodigoCache.set(prod.codigo, { data: prod, timestamp: now });
        }
      }
    }

    const productosPorCodigo: Record<string, any> = {};
    [...productosEnCache, ...productosDB].forEach(prod => {
      if (prod && prod.codigo) productosPorCodigo[prod.codigo] = prod;
    });
    const productosFinal = ids.map(codigo => productosPorCodigo[codigo]).filter(Boolean);

    const cacheKey = this.getIdsCacheKey(ids, fields);
    if (ids.length > 1 && this.productosCache.size < this.MAX_CACHE_ENTRIES) {
      this.productosCache.set(cacheKey, {
        data: productosFinal,
        total: productosFinal.length,
        timestamp: now
      });
    }

    let paginados = productosFinal;
    if (filters.offset !== undefined || filters.limit !== undefined) {
      const offset = Number(filters.offset) || 0;
      const limit = Number(filters.limit) || productosFinal.length;
      paginados = productosFinal.slice(offset, offset + limit);
    }
    return paginados;
  }

  async findByPromos(filters: any = {}) {
    const promos = await this.promosService.findAll(filters);
    const codigos: string[] = promos
      .flatMap((promo: any) =>
        Array.isArray(promo.contenido?.producto)
          ? promo.contenido.producto.map((p: any) => p.codigo)
          : [],
      )
      .filter((codigo) => !!codigo)
    return this.findByIds(codigos, filters.fields, filters);
  }
}
