import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductoMongo, ProductoMongoDocument } from '../../schemas/products-seller/products-mongo.schema';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { Proveedor } from '../../schemas/products-seller/proveedor.schema';

function slugify(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

@Injectable()
export class ProductsSellerMongoService {
  private readonly logger = new Logger(ProductsSellerMongoService.name);

  constructor(
    @InjectModel(ProductoMongo.name)
    private readonly productoModel: Model<ProductoMongoDocument>,
  ) {}

  buildDeposito(proveedor: Proveedor, seller: ProductsSeller): string {
    const inicial = (proveedor.nombre || '').trim().charAt(0).toUpperCase();
    return `${inicial}${seller.codigo_proveedor_interno || ''}`;
  }

  async upsertFromSellerRow(
    seller: ProductsSeller,
    proveedor: Proveedor,
    categoriaNombre: string | null,
    subcategoriaNombre: string | null,
  ): Promise<void> {
    const imagenes = [seller.imagen_1, seller.imagen_2, seller.imagen_3, seller.imagen_4, seller.imagen_5].filter(
      (url): url is string => !!url,
    );

    const categorias = categoriaNombre
      ? [{ nombre: categoriaNombre, ruta: slugify(categoriaNombre), _id: new Types.ObjectId() }]
      : [];
    const subcategorias = subcategoriaNombre
      ? [{ nombre: subcategoriaNombre, ruta: slugify(subcategoriaNombre), _id: new Types.ObjectId() }]
      : [];

    try {
      await this.productoModel.findOneAndUpdate(
        { codigo: seller.codigo_articulo },
        {
          codigo: seller.codigo_articulo,
          codigoBarra: seller.codigo_de_barra,
          marca: seller.marca_sugerida || seller.marca_texto_original,
          nombre: seller.nombre_articulo,
          descripcion: seller.descripcion,
          costo: seller.costo === null || seller.costo === undefined ? null : Number(seller.costo),
          precio: seller.precioventa,
          cantidad: seller.stock_actual,
          categorias,
          subcategorias,
          imagenes,
          deposito: this.buildDeposito(proveedor, seller),
          estado: seller.estado === 'aprobado' ? 1 : 0,
          proveedores: [{ id_proveedor: seller.id_proveedor, codigo_proveedor_interno: seller.codigo_proveedor_interno }],
        },
        { upsert: true, new: true },
      );
    } catch (error: any) {
      this.logger.error(`No se pudo sincronizar a Mongo el producto ${seller.codigo_articulo}: ${error.message}`);
    }
  }
}
