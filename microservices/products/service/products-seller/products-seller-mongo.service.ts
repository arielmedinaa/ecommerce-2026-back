import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductoMongo, ProductoMongoDocument } from '../../schemas/products-seller/products-mongo.schema';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { Proveedor } from '../../schemas/products-seller/proveedor.schema';
import { LegacyBucketUtil } from '../../utils/products-seller/legacy-bucket.util';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { repararMojibake } from '../../utils/text/mojibake.util';
import { ProductsSellerErpMatchService } from './products-seller-erp-match.service';

function generarRuta(texto: string): string {
  let resultado = (texto || '').toLowerCase();
  resultado = resultado.replace(/\s/g, '_');
  resultado = resultado.replace(/[\^*@!"#$%&/+()=?¡!¿.:,;'\\]/gi, '');
  resultado = resultado.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  resultado = resultado.replace(/[^a-z0-9_]/g, '');
  return resultado;
}

const RUTA_VALIDA = /^[a-z0-9_]+$/;

const IMAGEN_CAMPOS = ['imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5'] as const;

@Injectable()
export class ProductsSellerMongoService {
  private readonly logger = new Logger(ProductsSellerMongoService.name);

  constructor(
    @InjectModel(ProductoMongo.name)
    private readonly productoModel: Model<ProductoMongoDocument>,
    private readonly legacyBucket: LegacyBucketUtil,
    private readonly imageStorage: ImageStorageService,
    private readonly erpMatch: ProductsSellerErpMatchService,
  ) {}

  private async resolverEstadoMatchErp(seller: ProductsSeller): Promise<string> {
    if (seller.estado !== 'aprobado') return seller.erp_match_status;

    if (seller.erp_match_status === 'match_automatico' && seller.erp_articulo_match) {
      const vigente = await this.erpMatch.siguevigenteMatchAutomatico(seller.erp_articulo_match);
      if (vigente) return 'match_automatico';
      await this.erpMatch.marcarSinMatch(seller.id);
      return 'sin_match';
    }

    if (!seller.erp_match_evaluado_at) {
      const resultado = await this.erpMatch.evaluarMatch(seller);
      return resultado.status;
    }

    return seller.erp_match_status;
  }

  private async backfillLegacyImages(seller: ProductsSeller): Promise<void> {
    if (!this.legacyBucket.isEnabled()) return;
    for (const campo of IMAGEN_CAMPOS) {
      const url = seller[campo];
      if (!url || typeof url !== 'string') continue;
      const match = url.match(/[?&]key=([^&]+)/);
      if (!match) continue;
      const key = decodeURIComponent(match[1]);
      try {
        const { buffer } = await this.imageStorage.getObjectBuffer(key);
        await this.legacyBucket.uploadSizes(buffer, seller.codigo_articulo, campo);
      } catch (err: any) {
        this.logger.warn(`Backfill legacy: no se pudo re-subir ${seller.codigo_articulo}/${campo}: ${err?.message || err}`);
      }
    }
  }

  async backfillSellerRow(
    seller: ProductsSeller,
    proveedor: Proveedor,
    categoriaNombre: string | null,
    subcategoriaNombre: string | null,
  ): Promise<void> {
    await this.backfillLegacyImages(seller);
    await this.upsertFromSellerRow(seller, proveedor, categoriaNombre, subcategoriaNombre);
  }

  private async resolverRuta(seller: ProductsSeller, existente: ProductoMongoDocument | null): Promise<string> {
    if (existente?.ruta && RUTA_VALIDA.test(existente.ruta)) return existente.ruta;

    const base = generarRuta(repararMojibake(seller.nombre_articulo) || seller.codigo_articulo);
    let candidata = base;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const enUso = await this.productoModel.findOne({ ruta: candidata, codigo: { $ne: seller.codigo_articulo } });
      if (!enUso) return candidata;
      candidata = `${candidata}_`;
    }
  }

  private buildImagenes(seller: ProductsSeller): any[] {
    if (!this.legacyBucket.isEnabled()) return [];
    const imagenes: any[] = [];
    for (const campo of IMAGEN_CAMPOS) {
      const url = seller[campo];
      if (!url) continue;
      const { formato, url: sizes } = this.legacyBucket.describe(seller.codigo_articulo, campo);
      imagenes.push({ variante: campo, formato, url: sizes });
    }
    return imagenes;
  }

  async upsertFromSellerRow(
    seller: ProductsSeller,
    proveedor: Proveedor,
    categoriaNombre: string | null,
    subcategoriaNombre: string | null,
  ): Promise<void> {
    try {
      const existente = await this.productoModel.findOne({ codigo: seller.codigo_articulo });
      const ruta = await this.resolverRuta(seller, existente);

      const marcaNombre = repararMojibake((seller.marca_sugerida || seller.marca_texto_original || '').trim());
      const nombreArticulo = repararMojibake(seller.nombre_articulo);
      const descripcion = repararMojibake(seller.descripcion || '');
      const categorias = categoriaNombre ? [{ nombre: categoriaNombre, ruta: generarRuta(categoriaNombre) }] : [];
      const subcategorias = subcategoriaNombre ? [{ nombre: subcategoriaNombre, ruta: generarRuta(subcategoriaNombre) }] : [];
      const aprobado = seller.estado === 'aprobado';
      const precioventa = Number(seller.precioventa) || 0;
      const matchStatus = await this.resolverEstadoMatchErp(seller);
      const oculto = matchStatus === 'match_automatico';

      await this.productoModel.findOneAndUpdate(
        { codigo: seller.codigo_articulo },
        {
          codigo: seller.codigo_articulo,
          codigoBarra: seller.codigo_de_barra || '',
          marca: marcaNombre ? { nombre: marcaNombre, ruta: generarRuta(marcaNombre) } : null,
          modelo: '',
          nombre: nombreArticulo,
          ruta,
          descripcion,
          venta: precioventa,
          costo: seller.costo === null || seller.costo === undefined ? null : Number(seller.costo),
          precio: precioventa,
          cantidad: seller.stock_actual || 0,
          descuento: 0,
          categorias,
          subcategorias,
          proveedores: [proveedor.nombre],
          imagenes: this.buildImagenes(seller),
          imagen: '',
          sello: '',
          dias_ultimo_movimiento: 0,
          web: oculto ? 0 : 1,
          websc: oculto ? 0 : 1,
          prioridad: 1,
          orden: 0,
          tipo: 1,
          estado: aprobado ? 1 : 0,
          deposito: proveedor.nombre,
        },
        { upsert: true, new: true },
      );
    } catch (error: any) {
      this.logger.error(`No se pudo sincronizar a Mongo el producto ${seller.codigo_articulo}: ${error.message}`);
    }
  }
}
