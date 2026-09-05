import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@products/schemas/products/product.schema';

export interface ColumnDoc {
  descripcion: string;
  obligatorio: boolean;
  ejemplo: string;
}

// Distancia Levenshtein máxima aceptada como "match" automático de marca,
// relativa al largo del texto (tolera errores de tipeo, no matches al azar).
const MARCA_MATCH_MAX_RATIO = 0.3;

@Injectable()
export class ProductsSellersUtils {
  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
  ) {}

  readonly COLUMN_DOCS: Record<string, ColumnDoc> = {
    codigo_proveedor_interno: {
      descripcion: 'Tu propio código/SKU interno para este producto. Es solo una referencia tuya, no lo validamos contra nada.',
      obligatorio: false,
      ejemplo: 'PROV-00123',
    },
    nombre_articulo: {
      descripcion: 'Nombre del producto tal como se va a mostrar en la tienda.',
      obligatorio: true,
      ejemplo: 'Zapatilla Running Hombre Talle 42',
    },
    descripcion: {
      descripcion: 'Descripción o detalle adicional del producto (características, material, etc).',
      obligatorio: false,
      ejemplo: 'Zapatilla deportiva liviana, suela de goma antideslizante.',
    },
    marca: {
      descripcion: 'Nombre de la marca, escrito en texto libre. La relacionamos automáticamente con nuestro catálogo de marcas (tolera pequeños errores de tipeo). Si es una marca que no tenemos, un administrador la va a revisar antes de aprobar el producto.',
      obligatorio: true,
      ejemplo: 'Nike',
    },
    categoria: {
      descripcion: 'Elegí la categoría desde el DESPLEGABLE de la celda (no escribas texto libre) — la lista ya viene cargada con nuestras categorías reales.',
      obligatorio: true,
      ejemplo: '(seleccionar de la lista)',
    },
    subcategoria: {
      descripcion: 'Elegí la subcategoría desde el DESPLEGABLE de la celda. Debe pertenecer a la categoría elegida en la misma fila.',
      obligatorio: false,
      ejemplo: '(seleccionar de la lista)',
    },
    costo: {
      descripcion: 'Costo del producto, en guaraníes, solo números (sin puntos ni comas). Mínimo Gs. 9.000.',
      obligatorio: true,
      ejemplo: '350000',
    },
    codigo_de_barra: {
      descripcion: 'Código de barra (EAN/UPC) del producto, si tiene.',
      obligatorio: false,
      ejemplo: '7791234567890',
    },
    stock_actual: {
      descripcion: 'Cantidad de unidades disponibles para vender. Debe ser mayor a 0.',
      obligatorio: true,
      ejemplo: '25',
    },
    imagen_1: {
      descripcion: 'URL pública de la imagen principal del producto (debe poder abrirse sin usuario/contraseña).',
      obligatorio: true,
      ejemplo: 'https://midominio.com/fotos/producto1.jpg',
    },
    imagen_2: { descripcion: 'URL pública de una imagen adicional (opcional).', obligatorio: false, ejemplo: 'https://midominio.com/fotos/producto1-b.jpg' },
    imagen_3: { descripcion: 'URL pública de una imagen adicional (opcional).', obligatorio: false, ejemplo: '' },
    imagen_4: { descripcion: 'URL pública de una imagen adicional (opcional).', obligatorio: false, ejemplo: '' },
    imagen_5: { descripcion: 'URL pública de una imagen adicional (opcional).', obligatorio: false, ejemplo: '' },
  };

  // Busca la marca del ERP más parecida al texto libre del proveedor (fuzzy,
  // vía fn_levenshtein). Si la distancia relativa es alta, no hay match
  // suficientemente confiable y se deja para revisión manual del admin.
  async matchMarca(nombreProveedor: string): Promise<{ codigo: string | null; nombre: string | null; requiereRevision: boolean }> {
    const texto = nombreProveedor.trim();
    if (!texto) return { codigo: null, nombre: null, requiereRevision: true };

    const rows = await this.erpReadRepository.query(
      `SELECT codigo, nombre, fn_levenshtein(LOWER(?), LOWER(nombre)) AS distancia
       FROM marca
       ORDER BY distancia ASC
       LIMIT 1`,
      [texto],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { codigo: null, nombre: null, requiereRevision: true };
    }

    const best = rows[0];
    const distancia = Number(best.distancia);
    const ratio = distancia / Math.max(texto.length, 1);

    if (ratio <= MARCA_MATCH_MAX_RATIO) {
      return { codigo: String(best.codigo), nombre: best.nombre, requiereRevision: false };
    }
    return { codigo: null, nombre: best.nombre, requiereRevision: true };
  }

  // categoria/subcategoria vienen de un desplegable en el Excel (Data
  // Validation), así que el match esperado es EXACTO por nombre — fuzzy solo
  // sería necesario si alguien edita la celda a mano evadiendo el select.
  async matchCategoriaExacta(nombreCategoria: string): Promise<{ codigo: string | null }> {
    const rows = await this.erpReadRepository.query(
      `SELECT codigo FROM familia WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1`,
      [nombreCategoria],
    );
    return { codigo: Array.isArray(rows) && rows.length > 0 ? String(rows[0].codigo) : null };
  }

  async matchSubcategoriaExacta(nombreSubcategoria: string, codigoCategoria: string | null): Promise<{ codigo: string | null }> {
    if (!nombreSubcategoria) return { codigo: null };
    const params: any[] = [nombreSubcategoria];
    let where = `LOWER(TRIM(nombre)) = LOWER(TRIM(?))`;
    if (codigoCategoria) {
      where += ` AND categoria = ?`;
      params.push(codigoCategoria);
    }
    const rows = await this.erpReadRepository.query(
      `SELECT codigo FROM subfamilia WHERE ${where} LIMIT 1`,
      params,
    );
    return { codigo: Array.isArray(rows) && rows.length > 0 ? String(rows[0].codigo) : null };
  }

  async getRecargo(codigoCategoria: string | null, codigoSubcategoria: string | null): Promise<number> {
    if (codigoSubcategoria) {
      const rows = await this.erpReadRepository.query(
        `SELECT recargo FROM subfamilia WHERE codigo = ? LIMIT 1`,
        [codigoSubcategoria],
      );
      if (Array.isArray(rows) && rows.length > 0) return Number(rows[0].recargo) || 0;
    }
    if (codigoCategoria) {
      const rows = await this.erpReadRepository.query(
        `SELECT recargo FROM familia WHERE codigo = ? LIMIT 1`,
        [codigoCategoria],
      );
      if (Array.isArray(rows) && rows.length > 0) return Number(rows[0].recargo) || 0;
    }
    return 0;
  }
}
