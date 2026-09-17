import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@products/schemas/products/product.schema';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { Proveedor } from '../../schemas/products-seller/proveedor.schema';
import {
  CatalogOrderUtil,
  type ClavesDeOrden,
} from '../../utils/products-seller/catalog-order.util';

export type PublicSellerProduct = {
  codigo_articulo: string;
  nombre_articulo: string;
  descripcion: string | null;
  precioventa: number;
  stock_actual: number;
  imagenes: string[];
  nombre_marca: string | null;
  nombre_categoria: string | null;
  nombre_subcategoria: string | null;
  // Códigos del ERP (familia/subfamilia/marca) con los que se resolvieron los
  // nombres de arriba. Van en la respuesta pública porque el front los necesita
  // para armar cross-selling y comparables del producto de proveedor contra el
  // catálogo del ERP — sin ellos la PDP no tiene con qué relacionarlo.
  codigo_categoria: string | null;
  codigo_subcategoria: string | null;
  codigo_marca: string | null;
  codigo_de_barra: string | null;
  proveedor: { id: number; nombre: string } | null;
  // Claves de orden del catálogo, las mismas tres que expone el proc del ERP
  // (orden_proveedor_tier / score_proveedor / orden_ticket) más es_jota. Van en
  // la respuesta para que el front pueda mezclar las dos fuentes y re-ordenar
  // por relevancia sin perder el criterio de negocio.
  orden_proveedor_tier: number;
  score_proveedor: number | null;
  orden_ticket: number;
  es_jota: boolean;
  origen: 'seller';
};

// Marca JOTA en el ERP. Mismo valor que ProductsService.JOTA_MARCA.
const JOTA_MARCA = 257;

// Tope de filas que se traen para ordenar en memoria. El score y el tramo de
// ticket viven en el ERP (otra base), así que no hay ORDER BY posible en SQL:
// se ordena en JS y recién después se pagina. El catálogo aprobado es chico
// (decenas de productos); si algún día pasa este tope, el orden deja de ser
// global y hay que mover score/ticket a worker-RDS.
const MAX_ORDENABLE = 500;

/**
 * Orden del catálogo de proveedores. JOTA primero —la regla de negocio la pone
 * antes que todo cuando la consulta cae en su familia/subfamilia, y que un
 * producto JOTA aparezca en el resultado es justamente esa señal— y después las
 * tres claves compartidas con el proc del ERP.
 */
function compararCatalogo(
  a: PublicSellerProduct,
  b: PublicSellerProduct,
): number {
  if (a.es_jota !== b.es_jota) return a.es_jota ? -1 : 1;
  return CatalogOrderUtil.comparar(a, b);
}

@Injectable()
export class SellerCatalogService {
  constructor(
    @InjectRepository(ProductsSeller, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly sellerRepository: Repository<ProductsSeller>,
    @InjectRepository(Proveedor, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly proveedorRepository: Repository<Proveedor>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
    private readonly catalogOrder: CatalogOrderUtil,
  ) {}

  private async toPublicShape(rows: ProductsSeller[]): Promise<PublicSellerProduct[]> {
    if (rows.length === 0) return [];

    const proveedorIds = [...new Set(rows.map((r) => r.id_proveedor))];
    const categoriaCodigos = [...new Set(rows.map((r) => r.codigo_categoria).filter(Boolean))];
    const subcategoriaCodigos = [...new Set(rows.map((r) => r.codigo_subcategoria).filter(Boolean))];

    const [proveedores, familias, subfamilias]: [Proveedor[], Array<{ codigo: string; nombre: string }>, Array<{ codigo: string; nombre: string }>] = await Promise.all([
      proveedorIds.length
        ? this.proveedorRepository.find({ where: proveedorIds.map((id) => ({ id })) })
        : Promise.resolve([]),
      categoriaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM familia WHERE codigo IN (${categoriaCodigos.map(() => '?').join(',')})`,
            categoriaCodigos,
          )
        : Promise.resolve([]),
      subcategoriaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM subfamilia WHERE codigo IN (${subcategoriaCodigos.map(() => '?').join(',')})`,
            subcategoriaCodigos,
          )
        : Promise.resolve([]),
    ]);

    const proveedorById = new Map(proveedores.map((p) => [p.id, p]));
    const familiaByCodigo = new Map(familias.map((f) => [String(f.codigo), f.nombre]));
    const subfamiliaByCodigo = new Map(subfamilias.map((s) => [String(s.codigo), s.nombre]));

    const claves = await this.catalogOrder.clavesPara(
      rows.map((r) => ({
        precio: Number(r.precioventa),
        codigoErpProveedor: proveedorById.get(r.id_proveedor)?.codigo_erp ?? null,
      })),
    );

    return rows.map((r, i) => {
      const proveedor = proveedorById.get(r.id_proveedor);
      const marcaTexto = r.marca_sugerida || r.marca_texto_original || '';
      return {
        codigo_articulo: r.codigo_articulo,
        nombre_articulo: r.nombre_articulo,
        descripcion: r.descripcion ?? null,
        precioventa: Number(r.precioventa),
        stock_actual: r.stock_actual,
        imagenes: [r.imagen_1, r.imagen_2, r.imagen_3, r.imagen_4, r.imagen_5].filter(Boolean) as string[],
        nombre_marca: marcaTexto || null,
        nombre_categoria: r.codigo_categoria ? familiaByCodigo.get(r.codigo_categoria) || null : null,
        nombre_subcategoria: r.codigo_subcategoria ? subfamiliaByCodigo.get(r.codigo_subcategoria) || null : null,
        codigo_categoria: r.codigo_categoria ?? null,
        codigo_subcategoria: r.codigo_subcategoria ?? null,
        codigo_marca: r.codigo_marca ?? null,
        codigo_de_barra: r.codigo_de_barra ?? null,
        proveedor: proveedor ? { id: proveedor.id, nombre: proveedor.nombre } : null,
        orden_proveedor_tier: claves[i].orden_proveedor_tier,
        score_proveedor: claves[i].score_proveedor,
        orden_ticket: claves[i].orden_ticket,
        // Misma detección que usa el front (marca 257 o el nombre de la marca).
        es_jota:
          Number(r.codigo_marca) === JOTA_MARCA || /jota/i.test(marcaTexto),
        origen: 'seller' as const,
      };
    });
  }

  async listCatalog(filters: {
    search?: string;
    categoria?: string;
    marca?: string;
    proveedor?: string | number;
    precioMin?: number;
    precioMax?: number;
    soloConStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: PublicSellerProduct[]; total: number; message: string; success: boolean }> {
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    const qb = this.sellerRepository
      .createQueryBuilder('s')
      .where('s.estado = :estado', { estado: 'aprobado' })
      .andWhere("s.erp_match_status != 'match_automatico'");

    if (filters.search) {
      qb.andWhere('LOWER(s.nombre_articulo) LIKE :search', { search: `%${filters.search.toLowerCase()}%` });
    }
    if (filters.categoria) {
      qb.andWhere('s.codigo_categoria = :categoria', { categoria: filters.categoria });
    }
    if (filters.marca) {
      qb.andWhere('s.codigo_marca = :marca', { marca: filters.marca });
    }
    if (filters.proveedor) {
      qb.andWhere('s.id_proveedor = :proveedor', { proveedor: Number(filters.proveedor) });
    }
    if (filters.precioMin != null) {
      qb.andWhere('s.precioventa >= :precioMin', { precioMin: Number(filters.precioMin) });
    }
    if (filters.precioMax != null) {
      qb.andWhere('s.precioventa <= :precioMax', { precioMax: Number(filters.precioMax) });
    }
    if (filters.soloConStock) {
      qb.andWhere('s.stock_actual > 0');
    }

    // created_at sólo rompe empates: el orden real (tier de proveedor -> score
    // -> ticket) se aplica después, en memoria, porque esas claves están en el
    // ERP y no en esta conexión.
    qb.orderBy('s.created_at', 'DESC').take(MAX_ORDENABLE);

    const [rows, total] = await qb.getManyAndCount();
    const conClaves = await this.toPublicShape(rows);
    conClaves.sort(compararCatalogo);

    return {
      data: conClaves.slice(offset, offset + limit),
      total,
      message: 'Ok',
      success: true,
    };
  }

  async getByCodigo(codigo: string): Promise<{ data: PublicSellerProduct | null; message: string; success: boolean }> {
    const row = await this.sellerRepository.findOne({ where: { codigo_articulo: codigo, estado: 'aprobado' } });
    if (!row) return { data: null, message: 'Producto no encontrado', success: false };
    const [data] = await this.toPublicShape([row]);
    return { data, message: 'Ok', success: true };
  }

  async getFacets(): Promise<{ data: { marcas: Array<{ codigo: string; nombre: string }>; categorias: Array<{ codigo: string; nombre: string }> }; message: string; success: boolean }> {
    const rows = await this.sellerRepository
      .createQueryBuilder('s')
      .where('s.estado = :estado', { estado: 'aprobado' })
      .andWhere("s.erp_match_status != 'match_automatico'")
      .getMany();
    const categoriaCodigos = [...new Set(rows.map((r) => r.codigo_categoria).filter(Boolean))];
    const marcaCodigos = [...new Set(rows.map((r) => r.codigo_marca).filter(Boolean))];

    const [familias, marcas] = await Promise.all([
      categoriaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM familia WHERE codigo IN (${categoriaCodigos.map(() => '?').join(',')})`,
            categoriaCodigos,
          )
        : Promise.resolve([]),
      marcaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM marca WHERE codigo IN (${marcaCodigos.map(() => '?').join(',')})`,
            marcaCodigos,
          )
        : Promise.resolve([]),
    ]);

    return {
      data: {
        categorias: familias.map((f: any) => ({ codigo: String(f.codigo), nombre: f.nombre })),
        marcas: marcas.map((m: any) => ({ codigo: String(m.codigo), nombre: m.nombre })),
      },
      message: 'Ok',
      success: true,
    };
  }
}
