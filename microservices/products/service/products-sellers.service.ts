import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '@products/schemas/product.schema';
import { ProductsSeller } from '../schemas/products-seller.schema';
import { Proveedor } from '../schemas/proveedor.schema';
import { REJECTION_CODES } from '../constants/rejection-codes';
import { NotificationsService } from './notifications.service';
import { ProductsSellersUtils } from '../utils/utils-products-sellers';

type RowResult = {
  fila: number;
  aceptado: boolean;
  motivo?: string;
  codigo_articulo?: string;
  requiere_revision?: boolean;
};

@Injectable()
export class ProductsSellersService {
  private readonly logger = new Logger(ProductsSellersService.name);

  constructor(
    @InjectRepository(ProductsSeller, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly sellerRepository: Repository<ProductsSeller>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
    @InjectRepository(Proveedor, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly proveedorRepository: Repository<Proveedor>,
    private readonly notificationsService: NotificationsService,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly sellersUtils: ProductsSellersUtils,
  ) {}

  async resolveProveedorIdByEmail(email: string): Promise<number | null> {
    if (!email) return null;
    const proveedor = await this.proveedorRepository
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.email)) = LOWER(TRIM(:email))', { email })
      .getOne();
    return proveedor ? proveedor.id : null;
  }

  async generateTemplate(): Promise<Buffer> {
    const familias: Array<{ codigo: string; nombre: string }> = await this.erpReadRepository.query(
      `SELECT codigo, nombre FROM familia WHERE estado = 1 ORDER BY nombre ASC`,
    );
    const subfamilias: Array<{ codigo: string; nombre: string; categoria: string }> = await this.erpReadRepository.query(
      `SELECT codigo, nombre, categoria FROM subfamilia WHERE estado = 1 ORDER BY nombre ASC`,
    );

    const columns = [
      'codigo_proveedor_interno', 'nombre_articulo', 'descripcion', 'marca',
      'categoria', 'subcategoria', 'precioventa', 'codigo_de_barra',
      'stock_actual', 'imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5',
    ];

    const workbook = new ExcelJS.Workbook();

    const instrucciones = workbook.addWorksheet('Instrucciones');
    instrucciones.columns = [
      { header: 'Columna', key: 'columna', width: 26 },
      { header: 'Obligatorio', key: 'obligatorio', width: 14 },
      { header: 'Para qué sirve', key: 'descripcion', width: 70 },
      { header: 'Ejemplo', key: 'ejemplo', width: 40 },
    ];
    instrucciones.getRow(1).font = { bold: true };
    instrucciones.addRow(['', '', '', '']);
    instrucciones.addRows(
      columns.map((c) => {
        const doc = this.sellersUtils.COLUMN_DOCS[c];
        return { columna: c, obligatorio: doc.obligatorio ? 'Sí' : 'No', descripcion: doc.descripcion, ejemplo: doc.ejemplo };
      }),
    );
    instrucciones.getColumn('descripcion').alignment = { wrapText: true, vertical: 'top' };
    instrucciones.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });

    const sheet = workbook.addWorksheet('Productos');
    const refSheet = workbook.addWorksheet('_Categorias');
    refSheet.state = 'hidden';

    sheet.addRow(columns);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const key = columns[colNumber - 1];
      const doc = this.sellersUtils.COLUMN_DOCS[key];
      if (doc) {
        cell.note = {
          texts: [{ text: `${doc.obligatorio ? '(Obligatorio) ' : '(Opcional) '}${doc.descripcion}\nEjemplo: ${doc.ejemplo}` }],
        };
      }
    });
    sheet.columns.forEach((col) => {
      col.width = 22;
    });

    refSheet.getColumn(1).values = ['categoria', ...familias.map((f) => f.nombre)];
    refSheet.getColumn(2).values = ['subcategoria', ...subfamilias.map((s) => s.nombre)];

    const lastRow = 200;
    const catCol = columns.indexOf('categoria') + 1;
    const subCol = columns.indexOf('subcategoria') + 1;
    const catRange = `_Categorias!$A$2:$A$${familias.length + 1}`;
    const subRange = `_Categorias!$B$2:$B$${subfamilias.length + 1}`;

    for (let r = 2; r <= lastRow; r++) {
      sheet.getRow(r).getCell(catCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [catRange],
      };
      sheet.getRow(r).getCell(subCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [subRange],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importExcel(
    buffer: Buffer,
    idProveedor: number,
    creadoPor: string,
  ): Promise<{ data: { aceptados: number; rechazados: number; detalle: RowResult[] }; message: string; success: boolean }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        return { data: { aceptados: 0, rechazados: 0, detalle: [] }, message: 'El archivo no tiene hojas', success: false };
      }

      const headerRow = sheet.getRow(1).values as any[];
      const colIndex: Record<string, number> = {};
      headerRow.forEach((h, idx) => {
        if (typeof h === 'string') colIndex[h.trim().toLowerCase()] = idx;
      });

      const getCell = (row: ExcelJS.Row, key: string): string => {
        const idx = colIndex[key];
        if (!idx) return '';
        const value = row.getCell(idx).value;
        return value === null || value === undefined ? '' : String(value).trim();
      };

      const detalle: RowResult[] = [];

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (row.actualCellCount === 0) continue;

        const nombre = getCell(row, 'nombre_articulo');
        const marcaTexto = getCell(row, 'marca');
        const categoriaTexto = getCell(row, 'categoria');
        const subcategoriaTexto = getCell(row, 'subcategoria');
        const precioventaStr = getCell(row, 'precioventa');
        const stockStr = getCell(row, 'stock_actual');
        const imagen1 = getCell(row, 'imagen_1');

        const precioventa = Number(precioventaStr);
        const stock = Number(stockStr || '0');

        if (!nombre) { detalle.push({ fila: i, aceptado: false, motivo: 'Falta nombre_articulo' }); continue; }
        if (!marcaTexto) { detalle.push({ fila: i, aceptado: false, motivo: 'Falta marca' }); continue; }
        if (!categoriaTexto) { detalle.push({ fila: i, aceptado: false, motivo: 'Falta categoria' }); continue; }
        if (!Number.isFinite(precioventa) || precioventa < 9000) {
          detalle.push({ fila: i, aceptado: false, motivo: 'precioventa inválido (mínimo Gs. 9.000)' });
          continue;
        }
        if (!Number.isFinite(stock) || stock <= 0) {
          detalle.push({ fila: i, aceptado: false, motivo: 'stock_actual debe ser mayor a 0' });
          continue;
        }
        if (!imagen1) { detalle.push({ fila: i, aceptado: false, motivo: 'Falta imagen_1' }); continue; }

        const marcaMatch = await this.sellersUtils.matchMarca(marcaTexto);
        const categoriaMatch = await this.sellersUtils.matchCategoriaExacta(categoriaTexto);
        const subcategoriaMatch = subcategoriaTexto
          ? await this.sellersUtils.matchSubcategoriaExacta(subcategoriaTexto, categoriaMatch.codigo)
          : { codigo: null };

        const requiereRevisionCategoria = !categoriaMatch.codigo || (!!subcategoriaTexto && !subcategoriaMatch.codigo);

        const codigoArticulo = `SEL-${uuidv4().slice(0, 8)}`;
        const entity = this.sellerRepository.create({
          codigo_articulo: codigoArticulo,
          codigo_proveedor_interno: getCell(row, 'codigo_proveedor_interno') || undefined,
          nombre_articulo: nombre,
          descripcion: getCell(row, 'descripcion') || undefined,
          codigo_marca: marcaMatch.codigo,
          marca_texto_original: marcaTexto,
          marca_sugerida: marcaMatch.nombre || undefined,
          requiere_revision_marca: marcaMatch.requiereRevision,
          codigo_categoria: categoriaMatch.codigo,
          codigo_subcategoria: subcategoriaMatch.codigo,
          requiere_revision_categoria: requiereRevisionCategoria,
          precioventa,
          codigo_de_barra: getCell(row, 'codigo_de_barra') || undefined,
          stock_actual: stock,
          imagen_1: imagen1,
          imagen_2: getCell(row, 'imagen_2') || undefined,
          imagen_3: getCell(row, 'imagen_3') || undefined,
          imagen_4: getCell(row, 'imagen_4') || undefined,
          imagen_5: getCell(row, 'imagen_5') || undefined,
          id_proveedor: idProveedor,
          estado: 'pendiente',
          created_by: creadoPor,
        });
        await this.sellerRepository.save(entity);
        detalle.push({
          fila: i,
          aceptado: true,
          codigo_articulo: codigoArticulo,
          requiere_revision: marcaMatch.requiereRevision || requiereRevisionCategoria,
        });
      }

      const aceptados = detalle.filter((d) => d.aceptado).length;
      const rechazados = detalle.length - aceptados;

      if (aceptados > 0) {
        await this.notificationsService.create({
          tipo: 'catalogo_pendiente',
          destinatarioTipo: 'admin',
          titulo: 'Nuevo catálogo pendiente de aprobación',
          mensaje: `Un proveedor subió ${aceptados} producto(s) para revisar y aprobar.`,
          payload: {
            idProveedor,
            aceptados,
            codigosArticulo: detalle.filter((d) => d.aceptado).map((d) => d.codigo_articulo),
          },
        });
      }

      return {
        data: { aceptados, rechazados, detalle },
        message: `Import procesado: ${aceptados} aceptados, ${rechazados} rechazados`,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error importando excel de proveedor: ${error.message}`);
      return {
        data: { aceptados: 0, rechazados: 0, detalle: [] },
        message: `Error al importar el archivo: ${error.message}`,
        success: false,
      };
    }
  }

  async listPendientes(idProveedor?: number): Promise<{ data: ProductsSeller[]; message: string; success: boolean }> {
    try {
      const where: any = { estado: 'pendiente' };
      if (idProveedor) where.id_proveedor = idProveedor;
      const data = await this.sellerRepository.find({ where, order: { created_at: 'DESC' } });
      return { data, message: 'Ok', success: true };
    } catch (error) {
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async listByProveedor(idProveedor: number): Promise<{ data: ProductsSeller[]; message: string; success: boolean }> {
    try {
      const data = await this.sellerRepository.find({
        where: { id_proveedor: idProveedor },
        order: { created_at: 'DESC' },
      });
      return { data, message: 'Ok', success: true };
    } catch (error) {
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async approve(
    id: number,
    modificadoPor: string,
    correccion?: { codigo_marca?: string; codigo_categoria?: string; codigo_subcategoria?: string },
  ): Promise<{ data: ProductsSeller | null; message: string; success: boolean }> {
    try {
      const seller = await this.sellerRepository.findOne({ where: { id } });
      if (!seller) return { data: null, message: 'Producto no encontrado', success: false };

      const codigoMarca = correccion?.codigo_marca ?? seller.codigo_marca;
      const codigoCategoria = correccion?.codigo_categoria ?? seller.codigo_categoria;
      const codigoSubcategoria = correccion?.codigo_subcategoria ?? seller.codigo_subcategoria;

      if (!codigoMarca || !codigoCategoria) {
        return { data: null, message: 'No se puede aprobar sin marca y categoría resueltas', success: false };
      }

      await this.sellerRepository.update(id, {
        codigo_marca: codigoMarca,
        codigo_categoria: codigoCategoria,
        codigo_subcategoria: codigoSubcategoria,
        requiere_revision_marca: false,
        requiere_revision_categoria: false,
        estado: 'aprobado',
        updated_by: modificadoPor,
      });
      const data = await this.sellerRepository.findOne({ where: { id } });
      return { data, message: 'Producto aprobado', success: true };
    } catch (error) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  getRejectionCodes() {
    return { data: Object.values(REJECTION_CODES), message: 'Ok', success: true };
  }

  async reject(
    id: number,
    codigoRechazo: number,
    notaAdicional: string | undefined,
    modificadoPor: string,
  ): Promise<{ data: ProductsSeller | null; message: string; success: boolean }> {
    try {
      const info = REJECTION_CODES[codigoRechazo];
      if (!info) {
        return { data: null, message: `Código de rechazo inválido: ${codigoRechazo}`, success: false };
      }

      const seller = await this.sellerRepository.findOne({ where: { id } });
      if (!seller) return { data: null, message: 'Producto no encontrado', success: false };

      const motivoTexto = notaAdicional ? `${info.motivo} — ${notaAdicional}` : info.motivo;

      await this.sellerRepository.update(id, {
        estado: 'rechazado',
        codigo_rechazo: codigoRechazo,
        motivo_rechazo: motivoTexto,
        updated_by: modificadoPor,
      });

      await this.notificationsService.create({
        tipo: 'producto_rechazado',
        destinatarioTipo: 'provider',
        idProveedor: seller.id_proveedor,
        titulo: `Producto rechazado: ${seller.nombre_articulo}`,
        mensaje: motivoTexto,
        payload: {
          id: seller.id,
          codigo_articulo: seller.codigo_articulo,
          codigoRechazo,
          solucion: info.solucion,
          campo: info.campo,
        },
      });

      const data = await this.sellerRepository.findOne({ where: { id } });
      return { data, message: 'Producto rechazado', success: true };
    } catch (error) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async bulkResubmit(
    ids: number[],
    correcciones: Record<number, Partial<ProductsSeller>>,
    idProveedor: number,
  ): Promise<{ data: { actualizados: number; detalle: RowResult[] }; message: string; success: boolean }> {
    const detalle: RowResult[] = [];
    let actualizados = 0;

    for (const id of ids) {
      const seller = await this.sellerRepository.findOne({ where: { id } });
      if (!seller || seller.id_proveedor !== idProveedor) {
        detalle.push({ fila: id, aceptado: false, motivo: 'Producto no encontrado o no pertenece a este proveedor' });
        continue;
      }
      if (seller.estado !== 'rechazado') {
        detalle.push({ fila: id, aceptado: false, motivo: 'El producto no está en estado rechazado' });
        continue;
      }

      const correccion = correcciones[id] || {};
      const merged: Partial<ProductsSeller> = { ...seller, ...correccion };

      let codigoMarca = seller.codigo_marca;
      let marcaSugerida = seller.marca_sugerida;
      let requiereRevisionMarca = seller.requiere_revision_marca;
      if (correccion.marca_texto_original && correccion.marca_texto_original !== seller.marca_texto_original) {
        const marcaMatch = await this.sellersUtils.matchMarca(correccion.marca_texto_original);
        codigoMarca = marcaMatch.codigo;
        marcaSugerida = marcaMatch.nombre || undefined;
        requiereRevisionMarca = marcaMatch.requiereRevision;
      } else if (correccion.codigo_marca) {
        codigoMarca = correccion.codigo_marca;
        requiereRevisionMarca = false;
      }

      await this.sellerRepository.update(id, {
        codigo_proveedor_interno: merged.codigo_proveedor_interno,
        nombre_articulo: merged.nombre_articulo,
        descripcion: merged.descripcion,
        codigo_marca: codigoMarca,
        marca_texto_original: correccion.marca_texto_original ?? seller.marca_texto_original,
        marca_sugerida: marcaSugerida,
        requiere_revision_marca: requiereRevisionMarca,
        codigo_categoria: correccion.codigo_categoria ?? seller.codigo_categoria,
        codigo_subcategoria: correccion.codigo_subcategoria ?? seller.codigo_subcategoria,
        precioventa: correccion.precioventa ?? seller.precioventa,
        codigo_de_barra: correccion.codigo_de_barra ?? seller.codigo_de_barra,
        stock_actual: correccion.stock_actual ?? seller.stock_actual,
        imagen_1: correccion.imagen_1 ?? seller.imagen_1,
        imagen_2: correccion.imagen_2 ?? seller.imagen_2,
        imagen_3: correccion.imagen_3 ?? seller.imagen_3,
        imagen_4: correccion.imagen_4 ?? seller.imagen_4,
        imagen_5: correccion.imagen_5 ?? seller.imagen_5,
        estado: 'pendiente',
        codigo_rechazo: null,
        motivo_rechazo: null,
      });

      actualizados++;
      detalle.push({ fila: id, aceptado: true, codigo_articulo: seller.codigo_articulo });
    }

    return {
      data: { actualizados, detalle },
      message: `${actualizados} de ${ids.length} producto(s) reenviados a revisión`,
      success: true,
    };
  }

  async getDashboardStats(idProveedor: number): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const aprobados = await this.sellerRepository.find({
        where: { id_proveedor: idProveedor, estado: 'aprobado' },
      });

      let ventasPorCodigo: Record<string, { unidades: number; monto: number }> = {};
      if (aprobados.length > 0) {
        try {
          const codigos = aprobados.map((p) => p.codigo_articulo);
          const response = await firstValueFrom(
            this.cartClient.send({ cmd: 'get_ventas_por_codigos' }, { codigos }),
          );
          ventasPorCodigo = (response && response.data) || {};
        } catch (err) {
          this.logger.error(`Error consultando ventas a cart-service: ${err.message}`);
        }
      }

      let unidadesTotales = 0;
      let ventasTotales = 0;
      const topProductos = aprobados
        .map((p) => {
          const venta = ventasPorCodigo[p.codigo_articulo] || { unidades: 0, monto: 0 };
          unidadesTotales += venta.unidades;
          ventasTotales += venta.monto;
          return {
            codigo_articulo: p.codigo_articulo,
            nombre_articulo: p.nombre_articulo,
            unidades: venta.unidades,
            monto: venta.monto,
          };
        })
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 10);

      return {
        data: {
          totalProductosAprobados: aprobados.length,
          unidadesTotales,
          ventasTotales,
          topProductos,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }
}
