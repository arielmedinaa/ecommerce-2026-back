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

  // --- Sistema de Caché ---
  private productosCache = new Map<string, { data: Product[]; timestamp: number; total: number }>();
  private productoPorCodigoCache = new Map<string, { data: any; timestamp: number }>();
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
      search: filters.search
    });
  }

  private getIdsCacheKey(ids: string[], fields?: string): string {
    const sortedIds = [...ids].sort();
    return `ids:${sortedIds.join(',')}:fields:${fields || 'all'}`;
  }

  invalidateCache(): void {
    this.productosCache.clear();
    this.productoPorCodigoCache.clear();
  }

  // --- Métodos de Consulta ---

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

    this.productosCache.set(cacheKey, { data, total, timestamp: now });
    return { data, total };
  }

  async findAll(filters: any = {}): Promise<{ data: Product[]; total: number }> {
    return this.getCachedProductos(filters);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ _id: id, estado: { $ne: 0 } })
      .lean();

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product as Product;
  }

  async findByCode(codigo: string): Promise<Product | null> {
    return this.productModel.findOne({ codigo, estado: { $ne: 0 } }).lean();
  }

  // --- Mutaciones ---

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel({
      ...createProductDto,
      estado: 1,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date()
    });
    this.invalidateCache();
    return createdProduct.save();
  }

  async update(id: string, updateProductDto: CreateProductDto): Promise<Product> {
    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      { ...updateProductDto, fecha_actualizacion: new Date() },
      { new: true }
    ).lean();

    if (!updatedProduct) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    this.invalidateCache();
    return updatedProduct as Product;
  }

  // --- Búsquedas Especializadas ---

  async searchProducts(filters: any = {}): Promise<{data: Product[], total: number}> {
    const query = {
      nombre: { $regex: filters.search, $options: 'i' },
      estado: 1,
      web: 1,
    };
    
    const total = await this.productModel.countDocuments(query);
    const productos = await this.productModel
      .find(query)
      .sort({ prioridad: -1, _id: 1 })
      .limit(total === 1 ? 1 : 4)
      .lean();
      
    return { data: productos as Product[], total };
  }

  async getProductsByCategory(categoryId: string, limit: number = 10, offset: number = 0) {
    const query = { 'categorias._id': categoryId, estado: 1, web: 1 };
    const [data, total] = await Promise.all([
      this.productModel.find(query)
        .sort({ prioridad: -1, _id: 1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .lean(),
      this.productModel.countDocuments(query)
    ]);
    return { data, total };
  }

  async findByIds(ids: string[], fields?: string, filters: any = {}) {
    if (!ids || ids.length === 0) return [];
    const now = Date.now();
    
    const projection = fields
      ? fields.split(',').reduce((acc, field) => ({ ...acc, [field.trim()]: 1 }), { _id: 0, codigo: 1 })
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

    // Paginación manual de los resultados combinados
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
}