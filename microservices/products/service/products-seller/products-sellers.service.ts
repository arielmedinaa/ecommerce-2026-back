import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Product } from '@products/schemas/products/product.schema';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { ProductsExcelHistorial } from '../../schemas/products/products-excel-historial.schema';
import { ProductsExcelHistorialDetalle } from '../../schemas/products/products-excel-historial-detalle.schema';
import { Proveedor } from '../../schemas/products-seller/proveedor.schema';
import { ProveedorDocumento } from '../../schemas/products-seller/proveedor-documento.schema';
import { ProveedorApiToken } from '../../schemas/products-seller/proveedor-api-token.schema';
import { REJECTION_CODES } from '../../constants/rejection-codes';
import { IMPORT_ERROR_CODES, getImportErrorCodesList } from '../../constants/import-error-codes';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductsSellersUtils } from '../../utils/products-seller/utils-products-sellers';
import { SellerImageValidatorUtil } from '../../utils/products-seller/seller-image-validator.util';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { hashPassword, verifyPassword } from '@shared/common/utils/password.util';
import { ProductsSellerAiApprovalService } from './products-seller-ai-approval.service';
import { ProductsSellerErpMatchService } from './products-seller-erp-match.service';
import { ProductsSellerMongoService } from './products-seller-mongo.service';
import { ProductsSellerConfigService } from './products-seller-config.service';
import { similitudNombres } from '../../utils/text/similitud-nombres';
import { repararMojibake } from '../../utils/text/mojibake.util';
import { EXTRA_COLUMNAS_POR_KEY } from '../../constants/products-seller-extra-columns';

const DOCUMENTOS_CONTENT_TYPES_PERMITIDOS = [
  'application/pdf',
  'text/plain',
  'application/json',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const IMPORT_BATCH_SIZE = 500;
const DEFAULT_PROVIDER_PASSWORD = 'proveedor123';
const UMBRAL_SIMILITUD_NOMBRE = 0.85;

type RowResult = {
  fila: number;
  aceptado: boolean;
  motivo?: string;
  codigoError?: number;
  solucion?: string;
  codigo_articulo?: string;
  requiere_revision?: boolean;
};

// Costo mínimo aceptado para un producto de proveedor (Gs.). Lo comparten la
// validación del import y la edición manual: si vive en dos lugares, se
// desincroniza. El texto que ve el proveedor está en IMPORT_ERROR_CODES[106].
const COSTO_MINIMO = 9000;

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
    @InjectRepository(Proveedor, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly proveedorWriteRepository: Repository<Proveedor>,
    @InjectRepository(ProveedorDocumento, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly proveedorDocumentoRepository: Repository<ProveedorDocumento>,
    @InjectRepository(ProveedorApiToken, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly proveedorApiTokenRepository: Repository<ProveedorApiToken>,
    @InjectRepository(ProductsExcelHistorial, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly excelHistorialRepository: Repository<ProductsExcelHistorial>,
    @InjectRepository(ProductsExcelHistorialDetalle, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly excelHistorialDetalleRepository: Repository<ProductsExcelHistorialDetalle>,
    private readonly notificationsService: NotificationsService,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly sellersUtils: ProductsSellersUtils,
    private readonly imageStorage: ImageStorageService,
    private readonly sellerImageValidator: SellerImageValidatorUtil,
    private readonly jwtService: JwtService,
    private readonly cache: CachePersistenteService,
    @Inject(forwardRef(() => ProductsSellerAiApprovalService))
    private readonly aiApproval: ProductsSellerAiApprovalService,
    private readonly erpMatchService: ProductsSellerErpMatchService,
    private readonly sellerMongoService: ProductsSellerMongoService,
    private readonly sellerConfigService: ProductsSellerConfigService,
  ) {}

  private excelHistorialKey(idProveedor: number, nombreArchivo: string): string {
    const safeName = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `products/excel-history/${idProveedor}/${Date.now()}-${safeName}`;
  }

  async resolveProveedorIdByEmail(email: string): Promise<number | null> {
    if (!email) return null;
    const proveedor = await this.proveedorRepository
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.email)) = LOWER(TRIM(:email))', { email })
      .getOne();
    return proveedor ? proveedor.id : null;
  }

  async createProveedor(payload: {
    nombre: string;
    email: string;
    password?: string;
  }): Promise<{ data: Proveedor | null; success: boolean; message: string }> {
    const existente = await this.proveedorRepository
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.email)) = LOWER(TRIM(:email))', { email: payload.email })
      .getOne();
    if (existente) {
      return { data: null, success: false, message: 'Ya existe un proveedor con ese email' };
    }

    const proveedor = await this.proveedorRepository.save(
      this.proveedorRepository.create({
        nombre: payload.nombre,
        email: payload.email,
        activo: true,
        password_hash: hashPassword(payload.password?.trim() || DEFAULT_PROVIDER_PASSWORD),
      }),
    );
    return { data: proveedor, success: true, message: 'Proveedor creado exitosamente' };
  }

  async listProveedores(): Promise<{ data: Proveedor[]; success: boolean; message: string }> {
    const data = await this.proveedorRepository.find({ order: { nombre: 'ASC' } });
    return { data, success: true, message: 'OK' };
  }

  async getProveedorProfile(idProveedor: number): Promise<{ data: Proveedor | null; success: boolean; message: string }> {
    const data = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
    if (!data) return { data: null, success: false, message: 'Proveedor no encontrado' };
    return { data, success: true, message: 'OK' };
  }

  async updateProveedorProfile(
    idProveedor: number,
    payload: { nombre?: string; ruc?: string; telefono?: string; direccion?: string },
  ): Promise<{ data: Proveedor | null; success: boolean; message: string }> {
    const proveedor = await this.proveedorWriteRepository.findOne({ where: { id: idProveedor } });
    if (!proveedor) return { data: null, success: false, message: 'Proveedor no encontrado' };

    await this.proveedorWriteRepository.update(idProveedor, {
      nombre: payload.nombre ?? proveedor.nombre,
      ruc: payload.ruc ?? proveedor.ruc,
      telefono: payload.telefono ?? proveedor.telefono,
      direccion: payload.direccion ?? proveedor.direccion,
    });
    const data = await this.proveedorWriteRepository.findOne({ where: { id: idProveedor } });
    return { data, success: true, message: 'Datos actualizados' };
  }

  async verifyProveedorPassword(
    email: string,
    password: string,
  ): Promise<{ data: { idProveedor: number; nombre: string; email: string } | null; success: boolean; message: string }> {
    if (!email || !password) {
      return { data: null, success: false, message: 'Email y contraseña son requeridos' };
    }
    const proveedor = await this.proveedorRepository
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.email)) = LOWER(TRIM(:email))', { email })
      .getOne();

    // Mensaje genérico deliberado: no revelar si el email existe o no.
    if (!proveedor || !proveedor.activo || !verifyPassword(password, proveedor.password_hash)) {
      return { data: null, success: false, message: 'Credenciales inválidas' };
    }

    return {
      data: { idProveedor: proveedor.id, nombre: proveedor.nombre, email: proveedor.email },
      success: true,
      message: 'OK',
    };
  }

  async registerProveedorLogin(idProveedor: number, acceptedTerms: boolean): Promise<void> {
    const proveedor = await this.proveedorWriteRepository.findOne({ where: { id: idProveedor } });
    if (!proveedor) return;

    const now = new Date();
    const update: Partial<Proveedor> = { ultimo_login_at: now };
    if (!proveedor.primer_login_at) update.primer_login_at = now;
    if (acceptedTerms && !proveedor.terminos_aceptados) {
      update.terminos_aceptados = true;
      update.terminos_aceptados_at = now;
    }

    await this.proveedorWriteRepository.update(idProveedor, update);
  }

  private async markPrimeraCargaProductos(idProveedor: number): Promise<void> {
    await this.proveedorWriteRepository
      .createQueryBuilder()
      .update(Proveedor)
      .set({ primera_carga_productos_at: () => 'COALESCE(primera_carga_productos_at, NOW())' })
      .where('id = :id', { id: idProveedor })
      .execute();
  }

  async listProveedoresConEstado(): Promise<{ data: any[]; success: boolean; message: string }> {
    const proveedores = await this.proveedorRepository.find({ order: { nombre: 'ASC' } });
    const counts = await this.sellerRepository
      .createQueryBuilder('s')
      .select('s.id_proveedor', 'idProveedor')
      .addSelect('COUNT(*)', 'total')
      .groupBy('s.id_proveedor')
      .getRawMany();
    const countMap = new Map(counts.map((c) => [Number(c.idProveedor), Number(c.total)]));

    const data = proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      activo: p.activo,
      terminosAceptados: p.terminos_aceptados,
      terminosAceptadosAt: p.terminos_aceptados_at,
      primerLoginAt: p.primer_login_at,
      ultimoLoginAt: p.ultimo_login_at,
      primeraCargaProductosAt: p.primera_carga_productos_at,
      haIngresado: !!p.primer_login_at,
      haCargadoProductos: !!p.primera_carga_productos_at,
      totalProductos: countMap.get(p.id) || 0,
    }));

    return { data, success: true, message: 'OK' };
  }

  async changeProveedorPassword(
    idProveedor: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' };
    }
    const proveedor = await this.proveedorWriteRepository.findOne({ where: { id: idProveedor } });
    if (!proveedor) {
      return { success: false, message: 'Proveedor no encontrado' };
    }
    if (proveedor.password_hash && !verifyPassword(currentPassword, proveedor.password_hash)) {
      return { success: false, message: 'La contraseña actual es incorrecta' };
    }

    await this.proveedorWriteRepository.update(idProveedor, { password_hash: hashPassword(newPassword) });
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  async listProveedorDocumentos(
    idProveedor: number,
  ): Promise<{ data: ProveedorDocumento[]; success: boolean; message: string }> {
    const data = await this.proveedorDocumentoRepository.find({
      where: { id_proveedor: idProveedor },
      order: { created_at: 'DESC' },
    });
    return { data, success: true, message: 'OK' };
  }

  async uploadProveedorDocumento(
    idProveedor: number,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ): Promise<{ data: ProveedorDocumento | null; success: boolean; message: string }> {
    if (!DOCUMENTOS_CONTENT_TYPES_PERMITIDOS.includes(file.mimetype)) {
      return { data: null, success: false, message: 'Tipo de archivo no permitido. Usá PDF, TXT, JSON, CSV o Excel.' };
    }
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `proveedor-docs/${idProveedor}/${Date.now()}-${safeName}`;
    const { url } = await this.imageStorage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    const documento = await this.proveedorDocumentoRepository.save(
      this.proveedorDocumentoRepository.create({
        id_proveedor: idProveedor,
        nombre_archivo: file.originalname,
        content_type: file.mimetype,
        s3_key: key,
        url,
      }),
    );
    return { data: documento, success: true, message: 'Documento subido' };
  }

  async deleteProveedorDocumento(
    idProveedor: number,
    idDocumento: number,
  ): Promise<{ success: boolean; message: string }> {
    const documento = await this.proveedorDocumentoRepository.findOne({
      where: { id: idDocumento, id_proveedor: idProveedor },
    });
    if (!documento) return { success: false, message: 'Documento no encontrado' };
    await this.imageStorage.deleteObject(documento.s3_key);
    await this.proveedorDocumentoRepository.delete(idDocumento);
    return { success: true, message: 'Documento eliminado' };
  }

  async generateProveedorApiToken(
    idProveedor: number,
  ): Promise<{ data: { token: string } | null; success: boolean; message: string }> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
    if (!proveedor) return { data: null, success: false, message: 'Proveedor no encontrado' };

    await this.proveedorApiTokenRepository.update(
      { id_proveedor: idProveedor, revoked_at: null as any },
      { revoked_at: new Date() },
    );

    const token = this.jwtService.sign(
      { sub: proveedor.id, email: proveedor.email, tipo: 'proveedor-api', scope: ['products:read', 'products:write'] },
      { expiresIn: '365d' },
    );
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.proveedorApiTokenRepository.save(
      this.proveedorApiTokenRepository.create({ id_proveedor: idProveedor, token_hash: tokenHash }),
    );

    return { data: { token }, success: true, message: 'Token generado' };
  }

  async revokeProveedorApiToken(idProveedor: number): Promise<{ success: boolean; message: string }> {
    await this.proveedorApiTokenRepository.update(
      { id_proveedor: idProveedor, revoked_at: null as any },
      { revoked_at: new Date() },
    );
    return { success: true, message: 'Token revocado' };
  }

  async upsertFromEtl(
    idProveedor: number,
    payload: {
      codigo_proveedor_interno?: string;
      codigo_de_barra?: string;
      nombre_articulo: string;
      descripcion?: string;
      costo: number;
      stock_actual: number;
      imagen_1: string;
      imagen_2?: string;
      imagen_3?: string;
      imagen_4?: string;
      imagen_5?: string;
      codigo_marca?: string | null;
      codigo_categoria?: string | null;
      codigo_subcategoria?: string | null;
    },
    creadoPor: string,
  ): Promise<{ data: ProductsSeller | null; created: boolean; success: boolean; message: string }> {
    if (!payload.codigo_proveedor_interno && !payload.codigo_de_barra) {
      return {
        data: null,
        created: false,
        success: false,
        message: 'El producto no trae codigo_proveedor_interno ni codigo_de_barra: no se puede deduplicar',
      };
    }
    if (!payload.imagen_1) {
      return { data: null, created: false, success: false, message: 'El producto no tiene imagen_1 válida' };
    }

    const where: any[] = [];
    if (payload.codigo_proveedor_interno) {
      where.push({ id_proveedor: idProveedor, codigo_proveedor_interno: payload.codigo_proveedor_interno });
    }
    if (payload.codigo_de_barra) {
      where.push({ id_proveedor: idProveedor, codigo_de_barra: payload.codigo_de_barra });
    }
    const existente = await this.sellerRepository.findOne({ where });
    const recargoEtl = await this.sellersUtils.getRecargo(
      payload.codigo_categoria || null,
      payload.codigo_subcategoria || null,
    );
    const precioventaEtl = Math.round(payload.costo * (1 + recargoEtl / 100) * 100) / 100;

    if (existente) {
      await this.sellerRepository.update(existente.id, {
        nombre_articulo: payload.nombre_articulo,
        descripcion: payload.descripcion,
        costo: payload.costo,
        precioventa: precioventaEtl,
        stock_actual: payload.stock_actual,
        imagen_1: payload.imagen_1,
        imagen_2: payload.imagen_2,
        imagen_3: payload.imagen_3,
        imagen_4: payload.imagen_4,
        imagen_5: payload.imagen_5,
        estado: 'pendiente',
        updated_by: creadoPor,
      });
      const data = await this.sellerRepository.findOne({ where: { id: existente.id } });
      if (data) await this.aiApproval.evaluarYAplicar(data, 'ai-agent');
      const dataFinal = await this.sellerRepository.findOne({ where: { id: existente.id } });
      if (dataFinal) await this.syncEtlProductoAMongo(dataFinal, idProveedor);
      return { data: dataFinal, created: false, success: true, message: 'Producto actualizado (ya existía)' };
    }

    const marcaMatch = await this.sellersUtils.matchMarca(payload.codigo_marca || '');
    const codigoArticulo = `SEL-${uuidv4().slice(0, 8)}`;
    const nuevo = await this.sellerRepository.save(
      this.sellerRepository.create({
        codigo_articulo: codigoArticulo,
        codigo_proveedor_interno: payload.codigo_proveedor_interno,
        codigo_de_barra: payload.codigo_de_barra,
        nombre_articulo: payload.nombre_articulo,
        descripcion: payload.descripcion,
        costo: payload.costo,
        precioventa: precioventaEtl,
        stock_actual: payload.stock_actual,
        imagen_1: payload.imagen_1,
        imagen_2: payload.imagen_2,
        imagen_3: payload.imagen_3,
        imagen_4: payload.imagen_4,
        imagen_5: payload.imagen_5,
        codigo_marca: payload.codigo_marca || marcaMatch.codigo,
        marca_texto_original: payload.codigo_marca,
        requiere_revision_marca: !payload.codigo_marca && !marcaMatch.codigo,
        codigo_categoria: payload.codigo_categoria,
        codigo_subcategoria: payload.codigo_subcategoria,
        requiere_revision_categoria: !payload.codigo_categoria,
        id_proveedor: idProveedor,
        estado: 'pendiente',
        created_by: creadoPor,
      }),
    );
    await this.aiApproval.evaluarYAplicar(nuevo, 'ai-agent');
    const dataFinal = await this.sellerRepository.findOne({ where: { id: nuevo.id } });
    if (dataFinal) await this.syncEtlProductoAMongo(dataFinal, idProveedor);
    return { data: dataFinal, created: true, success: true, message: 'Producto creado' };
  }

  // Mismo camino que sigue el import por Excel: una vez que el producto del
  // ETL ya tiene su veredicto final de IA (aprobado/rechazado), lo empuja a
  // la colección de Mongo que alimenta el storefront. Sin esto, el ETL sólo
  // alimentaba products_sellers y el producto nunca aparecía en la tienda.
  private async syncEtlProductoAMongo(seller: ProductsSeller, idProveedor: number): Promise<void> {
    try {
      const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
      if (!proveedor) return;
      const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
        seller.codigo_categoria,
        seller.codigo_subcategoria,
      );
      await this.sellerMongoService.upsertFromSellerRow(seller, proveedor, categoriaNombre, subcategoriaNombre);
    } catch (error: any) {
      this.logger.error(`syncEtlProductoAMongo: no se pudo sincronizar ${seller.codigo_articulo} a Mongo: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Alta y edición manual desde el panel del proveedor.
  //
  // Pasan por exactamente la misma validación que el import por Excel
  // (validarFilaCatalogo) para que no existan dos definiciones de "producto
  // válido" según la puerta por la que entre. Lo único que hace createManual
  // de más es traducir los nombres de campo del formulario a los de la
  // plantilla, porque el validador razona en términos de la planilla:
  // recibe la marca y la categoría como TEXTO y las resuelve contra el ERP,
  // mientras que el formulario ya trabaja con códigos.
  // ---------------------------------------------------------------------------

  private readonly CAMPOS_FORM_DIRECTOS = [
    'codigo_proveedor_interno', 'nombre_articulo', 'descripcion', 'codigo_de_barra',
    'costo', 'stock_actual', 'imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5',
  ] as const;

  private async formAFilaCatalogo(
    form: Record<string, any>,
    columnasActivas: string[],
  ): Promise<Record<string, string>> {
    const datos: Record<string, string> = {};
    const txt = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

    for (const campo of this.CAMPOS_FORM_DIRECTOS) datos[campo] = txt(form[campo]);
    for (const campo of columnasActivas) datos[campo] = txt(form[campo]);

    // El formulario manda marca como texto libre, igual que la planilla.
    datos.marca = txt(form.marca_texto_original ?? form.marca);

    // Categoría y subcategoría llegan como códigos (vienen de los selects) y el
    // validador las matchea por nombre exacto: se traducen acá. Si el código no
    // resuelve a ninguna familia, se deja el valor original para que el
    // validador lo trate como categoría no reconocida y no como categoría
    // ausente — son dos errores distintos (105 vs. revisión de categoría).
    const codigoCategoria = txt(form.codigo_categoria);
    const codigoSubcategoria = txt(form.codigo_subcategoria);
    const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
      codigoCategoria || null,
      codigoSubcategoria || null,
    );
    datos.categoria = categoriaNombre ?? codigoCategoria;
    datos.subcategoria = subcategoriaNombre ?? codigoSubcategoria;

    return datos;
  }

  /**
   * Alta manual de un producto. Devuelve el mismo `codigoError` que usa el
   * import (IMPORT_ERROR_CODES) para que el panel pueda mostrar el motivo y la
   * solución con el texto ya escrito, en vez de inventar mensajes propios.
   */
  async createManual(
    idProveedor: number,
    creadoPor: string,
    form: Record<string, any>,
  ): Promise<{
    data: ProductsSeller | null;
    created: boolean;
    codigoError?: number;
    motivo?: string;
    solucion?: string;
    campo?: string | null;
    message: string;
    success: boolean;
  }> {
    try {
      const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
      if (!proveedor) {
        return { data: null, created: false, message: 'Proveedor no encontrado', success: false };
      }

      const columnasActivas = await this.sellerConfigService.getColumnasActivas(idProveedor);
      const datos = await this.formAFilaCatalogo(form, columnasActivas);
      const resultado = await this.validarFilaCatalogo(
        idProveedor,
        creadoPor,
        datos,
        {},
        undefined,
        columnasActivas,
      );

      if (!resultado.ok) {
        const err = IMPORT_ERROR_CODES[resultado.codigo as number];
        return {
          data: null,
          created: false,
          codigoError: err?.codigo,
          motivo: err?.motivo,
          solucion: err?.solucion,
          campo: err?.campo ?? null,
          message: err?.motivo ?? 'No se pudo validar el producto',
          success: false,
        };
      }

      // Mismo criterio que el import: si el producto ya existía (por código
      // interno, código de barra o nombre muy parecido) se refresca en lugar de
      // duplicarlo, y vuelve a pendiente para que la IA lo revise de nuevo.
      if (resultado.existente && resultado.actualizacion) {
        await this.sellerRepository.update(resultado.existente.id, {
          ...resultado.actualizacion,
          estado: 'pendiente',
          codigo_rechazo: null,
          motivo_rechazo: null,
          updated_by: creadoPor,
        });
        const data = await this.resolverVeredictoYSincronizar(
          resultado.existente.id,
          proveedor,
          creadoPor,
          resultado.categoriaNombre ?? null,
          resultado.subcategoriaNombre ?? null,
        );
        return {
          data,
          created: false,
          message: 'Ya tenías este producto cargado: se actualizaron sus datos',
          success: true,
        };
      }

      const guardado = await this.sellerRepository.save(
        this.sellerRepository.create(resultado.entidad as Partial<ProductsSeller>),
      );
      const data = await this.resolverVeredictoYSincronizar(
        guardado.id,
        proveedor,
        creadoPor,
        resultado.categoriaNombre ?? null,
        resultado.subcategoriaNombre ?? null,
      );
      return { data, created: true, message: 'Producto cargado', success: true };
    } catch (error: any) {
      this.logger.error(`createManual (proveedor ${idProveedor}): ${error.message}`);
      return { data: null, created: false, message: `Error: ${error.message}`, success: false };
    }
  }

  /**
   * Edición manual de un producto propio del proveedor: stock, costo y las
   * columnas extra que tenga habilitadas. No toca nombre, marca ni categoría
   * —eso es un alta/re-subida, no una edición— ni el código interno, que es la
   * clave de deduplicación.
   *
   * Re-evalúa con IA sólo cuando el cambio puede mover el veredicto: si cambió
   * el costo (entra el mínimo de Gs. 9.000) o si el stock cruzó el cero (entra
   * el rechazo 303). Actualizar el stock de 10 a 8 no despublica el producto.
   */
  async updateManual(
    idProveedor: number,
    codigoArticulo: string,
    modificadoPor: string,
    cambios: Record<string, any>,
  ): Promise<{ data: ProductsSeller | null; message: string; success: boolean }> {
    try {
      const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
      if (!proveedor) return { data: null, message: 'Proveedor no encontrado', success: false };

      // La pertenencia va en el WHERE: un proveedor sólo puede editar lo suyo.
      const actual = await this.sellerRepository.findOne({
        where: { codigo_articulo: codigoArticulo, id_proveedor: idProveedor },
      });
      if (!actual) return { data: null, message: 'Producto no encontrado', success: false };

      const patch: Partial<ProductsSeller> = { updated_by: modificadoPor };
      let costoCambio = false;
      let stockCruzaCero = false;

      if (cambios.costo !== undefined && cambios.costo !== null && cambios.costo !== '') {
        const costo = Number(cambios.costo);
        if (!Number.isFinite(costo) || costo < COSTO_MINIMO) {
          const err = IMPORT_ERROR_CODES[106];
          return { data: null, message: err.motivo, success: false };
        }
        const recargo = await this.sellersUtils.getRecargo(
          actual.codigo_categoria || null,
          actual.codigo_subcategoria || null,
        );
        patch.costo = costo;
        patch.precioventa = Math.round(costo * (1 + recargo / 100) * 100) / 100;
        costoCambio = Number(actual.costo) !== costo;
      }

      if (cambios.stock_actual !== undefined && cambios.stock_actual !== null && cambios.stock_actual !== '') {
        const stock = Number(cambios.stock_actual);
        if (!Number.isFinite(stock) || stock < 0) {
          const err = IMPORT_ERROR_CODES[107];
          return { data: null, message: err.motivo, success: false };
        }
        patch.stock_actual = stock;
        stockCruzaCero = Number(actual.stock_actual) === 0 !== (stock === 0);
      }

      const columnasActivas = await this.sellerConfigService.getColumnasActivas(idProveedor);
      Object.assign(patch, this.parseExtraColumnas(
        Object.fromEntries(
          columnasActivas.map((c) => [c, cambios[c] === undefined || cambios[c] === null ? '' : String(cambios[c])]),
        ),
        columnasActivas.filter((c) => cambios[c] !== undefined),
      ));

      const reevaluar = costoCambio || stockCruzaCero;
      if (reevaluar) {
        patch.estado = 'pendiente';
        patch.codigo_rechazo = null;
        patch.motivo_rechazo = null;
      }

      await this.sellerRepository.update(actual.id, patch);

      const data = reevaluar
        ? await this.resolverVeredictoYSincronizar(
            actual.id,
            proveedor,
            modificadoPor,
            null,
            null,
            { resolverNombres: true },
          )
        : await this.sincronizarSinReevaluar(actual.id, proveedor);

      return {
        data,
        message: reevaluar
          ? 'Producto actualizado: el agente lo está revisando de nuevo'
          : 'Producto actualizado',
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`updateManual (proveedor ${idProveedor}, ${codigoArticulo}): ${error.message}`);
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  /**
   * Veredicto de IA y sincronización, en el orden correcto y releyendo la fila
   * entre los dos pasos.
   *
   * El re-read no es cosmético: evaluarYAplicar cambia el estado en la base
   * pero no el objeto que uno tiene en memoria, y upsertFromSellerRow decide
   * si corre el match contra el ERP mirando `seller.estado`. Pasarle el objeto
   * viejo —que todavía dice 'pendiente'— hace que el match nunca se evalúe.
   */
  private async resolverVeredictoYSincronizar(
    sellerId: number,
    proveedor: Proveedor,
    modificadoPor: string,
    categoriaNombre: string | null,
    subcategoriaNombre: string | null,
    opts: { resolverNombres?: boolean } = {},
  ): Promise<ProductsSeller | null> {
    const previo = await this.sellerRepository.findOne({ where: { id: sellerId } });
    if (previo) await this.aiApproval.evaluarYAplicar(previo, modificadoPor);

    const final = await this.sellerRepository.findOne({ where: { id: sellerId } });
    if (!final) return null;

    let catNombre = categoriaNombre;
    let subNombre = subcategoriaNombre;
    if (opts.resolverNombres) {
      const nombres = await this.sellersUtils.getNombresCategoria(
        final.codigo_categoria || null,
        final.codigo_subcategoria || null,
      );
      catNombre = nombres.categoriaNombre;
      subNombre = nombres.subcategoriaNombre;
    }

    try {
      await this.sellerMongoService.upsertFromSellerRow(final, proveedor, catNombre, subNombre);
    } catch (error: any) {
      this.logger.error(`No se pudo sincronizar ${final.codigo_articulo} a Mongo: ${error.message}`);
    }
    return this.sellerRepository.findOne({ where: { id: sellerId } });
  }

  private async sincronizarSinReevaluar(
    sellerId: number,
    proveedor: Proveedor,
  ): Promise<ProductsSeller | null> {
    const final = await this.sellerRepository.findOne({ where: { id: sellerId } });
    if (!final) return null;
    const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
      final.codigo_categoria || null,
      final.codigo_subcategoria || null,
    );
    try {
      await this.sellerMongoService.upsertFromSellerRow(final, proveedor, categoriaNombre, subcategoriaNombre);
    } catch (error: any) {
      this.logger.error(`No se pudo sincronizar ${final.codigo_articulo} a Mongo: ${error.message}`);
    }
    return this.sellerRepository.findOne({ where: { id: sellerId } });
  }

  private readonly TEMPLATE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6h: balance entre no regenerar siempre y no servir catálogo viejo por mucho tiempo

  private templateCacheKey(idProveedor?: number): string {
    return `products:sellers:template:v2:${idProveedor || 'base'}`;
  }

  async generateTemplate(idProveedor?: number): Promise<Buffer> {
    const cacheKey = this.templateCacheKey(idProveedor);
    const cached = await this.cache.get<{ base64: string }>(cacheKey);
    if (cached?.base64) {
      return Buffer.from(cached.base64, 'base64');
    }
    const buffer = await this.buildTemplateBuffer(idProveedor);
    await this.cache.set(cacheKey, { base64: buffer.toString('base64') }, this.TEMPLATE_CACHE_TTL);
    return buffer;
  }

  private async buildTemplateBuffer(idProveedor?: number): Promise<Buffer> {
    const familias: Array<{ codigo: string; nombre: string }> = await this.erpReadRepository.query(
      `SELECT codigo, nombre FROM familia WHERE activo = 1 ORDER BY nombre ASC`,
    );
    const subfamilias: Array<{ codigo: string; nombre: string; categoria: string }> = await this.erpReadRepository.query(
      `SELECT codigo, nombre, categoria FROM subfamilia WHERE activo = 1 ORDER BY nombre ASC`,
    );

    const columnasActivas = idProveedor ? await this.sellerConfigService.getColumnasActivas(idProveedor) : [];

    const columns = [
      'codigo_proveedor_interno', 'nombre_articulo', 'descripcion', 'marca',
      'categoria', 'subcategoria', 'costo', 'codigo_de_barra',
      'stock_actual', 'imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5',
      ...columnasActivas,
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
        const doc = this.sellersUtils.COLUMN_DOCS[c] || EXTRA_COLUMNAS_POR_KEY.get(c);
        return { columna: c, obligatorio: doc?.obligatorio ? 'Sí' : 'No', descripcion: doc?.descripcion || '', ejemplo: doc?.ejemplo || '' };
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
      const doc = this.sellersUtils.COLUMN_DOCS[key] || EXTRA_COLUMNAS_POR_KEY.get(key);
      if (doc) {
        cell.note = {
          texts: [{ text: `${doc.obligatorio ? '(Obligatorio) ' : '(Opcional) '}${doc.descripcion}\nEjemplo: ${doc.ejemplo}` }],
        };
      }
    });
    sheet.columns.forEach((col) => {
      col.width = 22;
    });

    const familiaByCodigo = new Map(familias.map((f) => [f.codigo, f.nombre]));
    const subfamiliasOrdenadas = [...subfamilias].sort((a, b) => {
      const catA = familiaByCodigo.get(a.categoria) || '';
      const catB = familiaByCodigo.get(b.categoria) || '';
      return catA.localeCompare(catB) || a.nombre.localeCompare(b.nombre);
    });

    refSheet.getColumn(1).values = ['categoria', ...familias.map((f) => f.nombre)];
    refSheet.getColumn(2).values = [
      'familia_de_subcategoria',
      ...subfamiliasOrdenadas.map((s) => familiaByCodigo.get(s.categoria) || ''),
    ];
    refSheet.getColumn(3).values = ['subcategoria', ...subfamiliasOrdenadas.map((s) => s.nombre)];

    const lastRow = 200;
    const catCol = columns.indexOf('categoria') + 1;
    const subCol = columns.indexOf('subcategoria') + 1;
    const catColLetter = sheet.getColumn(catCol).letter;
    const catRange = `_Categorias!$A$2:$A$${familias.length + 1}`;
    const subFamiliaLastRow = subfamiliasOrdenadas.length + 1;

    for (let r = 2; r <= lastRow; r++) {
      sheet.getRow(r).getCell(catCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [catRange],
      };
      const catCellRef = `$${catColLetter}${r}`;
      sheet.getRow(r).getCell(subCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [
          `OFFSET(_Categorias!$C$1,MATCH(${catCellRef},_Categorias!$B$2:$B$${subFamiliaLastRow},0),0,COUNTIF(_Categorias!$B$2:$B$${subFamiliaLastRow},${catCellRef}),1)`,
        ],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async initiateImport(
    buffer: Buffer,
    idProveedor: number,
    creadoPor: string,
    nombreArchivo?: string,
  ): Promise<{ data: { idHistorial: number; estado: string } | null; message: string; success: boolean }> {
    const nombreArchivoOriginal = nombreArchivo || `catalogo-${Date.now()}.xlsx`;
    let storageKey: string | null = null;
    if (this.imageStorage.isS3()) {
      try {
        const key = this.excelHistorialKey(idProveedor, nombreArchivoOriginal);
        await this.imageStorage.putObject({
          key,
          body: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        storageKey = key;
      } catch (storageErr: any) {
        this.logger.warn(`No se pudo guardar el excel de historial: ${storageErr?.message || storageErr}`);
      }
    }

    if (!storageKey) {
      return { data: null, message: 'No se pudo guardar el archivo para procesarlo. Intentá de nuevo.', success: false };
    }

    const historial = await this.excelHistorialRepository.save(
      this.excelHistorialRepository.create({
        id_proveedor: idProveedor,
        nombre_archivo_original: nombreArchivoOriginal,
        storage_key: storageKey,
        estado: 'procesando',
        created_by: creadoPor,
      }),
    );

    return { data: { idHistorial: historial.id, estado: 'procesando' }, message: 'Archivo recibido, procesando...', success: true };
  }

  private readonly CAMPOS_FILA_CATALOGO = [
    'codigo_proveedor_interno', 'nombre_articulo', 'descripcion', 'marca', 'categoria', 'subcategoria',
    'costo', 'codigo_de_barra', 'stock_actual',
    'imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5',
  ] as const;

  private async buscarProductoExistente(
    idProveedor: number,
    codigoInterno: string,
    codigoDeBarra: string,
    nombre: string,
    catalogoExistente?: ProductsSeller[],
  ): Promise<ProductsSeller | null> {
    if (codigoInterno) {
      const porCodigo = await this.sellerRepository.findOne({
        where: { id_proveedor: idProveedor, codigo_proveedor_interno: codigoInterno },
      });
      if (porCodigo) return porCodigo;
    }

    if (codigoDeBarra) {
      const porBarra = await this.sellerRepository.findOne({
        where: { id_proveedor: idProveedor, codigo_de_barra: codigoDeBarra },
      });
      if (porBarra) return porBarra;
    }

    if (!nombre) return null;

    // El catálogo se pasa precargado desde el import para no releer la tabla
    // entera una vez por fila del excel.
    const candidatos =
      catalogoExistente ?? (await this.sellerRepository.find({ where: { id_proveedor: idProveedor } }));

    let mejor: ProductsSeller | null = null;
    let mejorPuntaje = 0;
    for (const candidato of candidatos) {
      const puntaje = similitudNombres(nombre, candidato.nombre_articulo);
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = candidato;
      }
    }

    return mejorPuntaje >= UMBRAL_SIMILITUD_NOMBRE ? mejor : null;
  }

  private parseExtraColumnas(datos: Record<string, string>, columnasActivas: string[]): Record<string, any> {
    const extra: Record<string, any> = {};
    for (const key of columnasActivas) {
      const def = EXTRA_COLUMNAS_POR_KEY.get(key);
      if (!def) continue;
      const valor = (datos[key] || '').trim();
      if (!valor) {
        extra[key] = null;
        continue;
      }
      if (def.tipo === 'number') {
        const num = Number(valor);
        extra[key] = Number.isFinite(num) ? num : null;
      } else if (def.tipo === 'boolean') {
        extra[key] = ['si', 'sí', 'true', '1', 'yes'].includes(valor.toLowerCase());
      } else {
        extra[key] = valor;
      }
    }
    return extra;
  }

  private async validarFilaCatalogo(
    idProveedor: number,
    creadoPor: string,
    datos: Record<string, string>,
    embeddedBuffers: Partial<Record<string, Buffer>>,
    catalogoExistente?: ProductsSeller[],
    columnasActivas: string[] = [],
  ): Promise<{
    ok: boolean;
    entidad?: Partial<ProductsSeller>;
    codigoArticulo?: string;
    codigo?: number;
    categoriaNombre?: string | null;
    subcategoriaNombre?: string | null;
    existente?: ProductsSeller;
    actualizacion?: Partial<ProductsSeller>;
  }> {
    const nombre = (datos.nombre_articulo || '').trim();
    const marcaTexto = (datos.marca || '').trim();
    const categoriaTexto = (datos.categoria || '').trim();
    const subcategoriaTexto = (datos.subcategoria || '').trim();
    const costoStr = (datos.costo || datos.precioventa || '').trim();
    const stockStr = (datos.stock_actual || '').trim();
    const imagen1Texto = (datos.imagen_1 || '').trim();

    const costo = Number(costoStr);
    const stock = Number(stockStr || '0');

    if (!nombre) return { ok: false, codigo: 103 };
    if (!marcaTexto) return { ok: false, codigo: 104 };
    if (!categoriaTexto) return { ok: false, codigo: 105 };
    if (!Number.isFinite(costo) || costo < COSTO_MINIMO) return { ok: false, codigo: 106 };
    if (!Number.isFinite(stock) || stock < 0) return { ok: false, codigo: 107 };

    const marcaMatch = await this.sellersUtils.matchMarca(marcaTexto);
    const categoriaMatch = await this.sellersUtils.matchCategoriaExacta(categoriaTexto);
    const subcategoriaMatch = subcategoriaTexto
      ? await this.sellersUtils.matchSubcategoriaExacta(subcategoriaTexto, categoriaMatch.codigo)
      : { codigo: null };

    const requiereRevisionCategoria = !categoriaMatch.codigo || (!!subcategoriaTexto && !subcategoriaMatch.codigo);

    const recargo = await this.sellersUtils.getRecargo(categoriaMatch.codigo, subcategoriaMatch.codigo);
    const precioventa = Math.round(costo * (1 + recargo / 100) * 100) / 100;
    const existente = await this.buscarProductoExistente(
      idProveedor,
      (datos.codigo_proveedor_interno || '').trim(),
      (datos.codigo_de_barra || '').trim(),
      nombre,
      catalogoExistente,
    );

    const codigoArticuloParaImagenes = existente ? existente.codigo_articulo : `SEL-${uuidv4().slice(0, 8)}`;

    const embeddedBuffer1 = embeddedBuffers.imagen_1;
    let imagen1Final: string | null = existente ? existente.imagen_1 : null;
    if (embeddedBuffer1) {
      const result = await this.sellerImageValidator.validateAndUploadFromBuffer(embeddedBuffer1, idProveedor, codigoArticuloParaImagenes, 'imagen_1');
      if (result.success) imagen1Final = result.url;
    } else if (imagen1Texto) {
      const result = await this.sellerImageValidator.validateAndUploadFromUrl(imagen1Texto, idProveedor, codigoArticuloParaImagenes, 'imagen_1');
      if (result.success) imagen1Final = result.url;
    }
    if (!existente && !imagen1Final) {
      return { ok: false, codigo: imagen1Texto || embeddedBuffer1 ? 109 : 108 };
    }

    const imagenesAdicionales: Record<string, string | undefined> = {};
    for (const campo of ['imagen_2', 'imagen_3', 'imagen_4', 'imagen_5'] as const) {
      const buffer = embeddedBuffers[campo];
      const texto = (datos[campo] || '').trim();

      let urlFinal: string | undefined = existente ? existente[campo] : undefined;
      if (buffer) {
        const result = await this.sellerImageValidator.validateAndUploadFromBuffer(buffer, idProveedor, codigoArticuloParaImagenes, campo);
        if (result.success && result.url) urlFinal = result.url;
      } else if (texto) {
        const result = await this.sellerImageValidator.validateAndUploadFromUrl(texto, idProveedor, codigoArticuloParaImagenes, campo);
        if (result.success && result.url) urlFinal = result.url;
      }
      imagenesAdicionales[campo] = urlFinal;
    }

    if (existente) {
      return {
        ok: true,
        codigoArticulo: existente.codigo_articulo,
        existente,
        categoriaNombre: categoriaMatch.codigo ? categoriaTexto : null,
        subcategoriaNombre: subcategoriaMatch.codigo ? subcategoriaTexto : null,
        // Todo se refresca menos codigo_articulo (id interno) y
        // codigo_proveedor_interno (clave de match): se excluyen a propósito.
        actualizacion: {
          nombre_articulo: nombre,
          descripcion: (datos.descripcion || '').trim() || existente.descripcion,
          codigo_marca: marcaMatch.codigo,
          marca_texto_original: marcaTexto,
          marca_sugerida: marcaMatch.nombre || undefined,
          requiere_revision_marca: marcaMatch.requiereRevision,
          codigo_categoria: categoriaMatch.codigo,
          codigo_subcategoria: subcategoriaMatch.codigo,
          requiere_revision_categoria: requiereRevisionCategoria,
          costo,
          precioventa,
          codigo_de_barra: (datos.codigo_de_barra || '').trim() || existente.codigo_de_barra,
          stock_actual: stock,
          imagen_1: imagen1Final ?? existente.imagen_1,
          imagen_2: imagenesAdicionales.imagen_2,
          imagen_3: imagenesAdicionales.imagen_3,
          imagen_4: imagenesAdicionales.imagen_4,
          imagen_5: imagenesAdicionales.imagen_5,
          ...this.parseExtraColumnas(datos, columnasActivas),
        },
      };
    }

    return {
      ok: true,
      codigoArticulo: codigoArticuloParaImagenes,
      categoriaNombre: categoriaMatch.codigo ? categoriaTexto : null,
      subcategoriaNombre: subcategoriaMatch.codigo ? subcategoriaTexto : null,
      entidad: {
        codigo_articulo: codigoArticuloParaImagenes,
        codigo_proveedor_interno: (datos.codigo_proveedor_interno || '').trim() || undefined,
        nombre_articulo: nombre,
        descripcion: (datos.descripcion || '').trim() || undefined,
        codigo_marca: marcaMatch.codigo,
        marca_texto_original: marcaTexto,
        marca_sugerida: marcaMatch.nombre || undefined,
        requiere_revision_marca: marcaMatch.requiereRevision,
        codigo_categoria: categoriaMatch.codigo,
        codigo_subcategoria: subcategoriaMatch.codigo,
        requiere_revision_categoria: requiereRevisionCategoria,
        costo,
        precioventa,
        codigo_de_barra: (datos.codigo_de_barra || '').trim() || undefined,
        stock_actual: stock,
        imagen_1: imagen1Final,
        imagen_2: imagenesAdicionales.imagen_2,
        imagen_3: imagenesAdicionales.imagen_3,
        imagen_4: imagenesAdicionales.imagen_4,
        imagen_5: imagenesAdicionales.imagen_5,
        id_proveedor: idProveedor,
        estado: 'pendiente',
        created_by: creadoPor,
        ...this.parseExtraColumnas(datos, columnasActivas),
      },
    };
  }

  private buildEmbeddedImageMap(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet): Map<string, Buffer> {
    const map = new Map<string, Buffer>();
    const images = sheet.getImages?.() || [];
    for (const img of images) {
      const media = (workbook as any).getImage?.(img.imageId);
      if (!media?.buffer) continue;
      const fila = Math.round(img.range.tl.row) + 1;
      const columna = Math.round(img.range.tl.col) + 1;
      map.set(`${fila}:${columna}`, Buffer.isBuffer(media.buffer) ? media.buffer : Buffer.from(media.buffer));
    }
    return map;
  }

  async processImportJob(idHistorial: number): Promise<void> {
    const historial = await this.excelHistorialRepository.findOne({ where: { id: idHistorial } });
    if (!historial || !historial.storage_key) {
      this.logger.error(`processImportJob: historial ${idHistorial} no encontrado o sin storage_key`);
      return;
    }

    const idProveedor = historial.id_proveedor;
    const creadoPor = historial.created_by;

    try {
      const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
      const { buffer } = await this.imageStorage.getObjectBuffer(historial.storage_key);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      if (workbook.worksheets.length === 0) {
        await this.failImportJob(idHistorial, IMPORT_ERROR_CODES[101]);
        return;
      }

      const sheet = workbook.getWorksheet('Productos') || workbook.worksheets[1] || workbook.worksheets[0];
      const headerRowValues = (sheet.getRow(1).values as any[]) || [];
      const pareceHojaDeProductos = headerRowValues.some(
        (h) => typeof h === 'string' && h.trim().toLowerCase() === 'nombre_articulo',
      );
      if (!pareceHojaDeProductos) {
        await this.failImportJob(idHistorial, IMPORT_ERROR_CODES[102]);
        return;
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
        return value === null || value === undefined ? '' : repararMojibake(String(value).trim());
      };

      const embeddedImages = this.buildEmbeddedImageMap(workbook, sheet);

      let entidadesBatch: ProductsSeller[] = [];
      let metaBatch: { categoriaNombre: string | null; subcategoriaNombre: string | null }[] = [];
      let detalleBatch: Partial<ProductsExcelHistorialDetalle>[] = [];
      let totalFilas = 0;
      let aceptados = 0;
      let rechazados = 0;
      let actualizados = 0;
      const codigosAceptados: string[] = [];

      // Catálogo actual del proveedor, leído una sola vez: lo usa la detección
      // por similitud de nombre de cada fila. Se le van sumando los productos
      // nuevos del propio excel, para que un archivo que trae el mismo producto
      // repetido en dos filas no lo inserte dos veces.
      const catalogoExistente = await this.sellerRepository.find({ where: { id_proveedor: idProveedor } });
      const columnasActivas = await this.sellerConfigService.getColumnasActivas(idProveedor);

      const flushBatch = async () => {
        if (entidadesBatch.length > 0) {
          const saved = await this.sellerRepository.save(entidadesBatch);
          catalogoExistente.push(...saved);
          const ids = saved.map((s) => s.id);
          if (ids.length > 0) await this.sellerRepository.update(ids, { id_historial_excel: idHistorial });
          // Evaluación de IA: cada producto recién guardado ('pendiente') se
          // resuelve acá mismo a aprobado/rechazado — nunca queda pendiente
          // esperando a un admin.
          for (const seller of saved) {
            await this.aiApproval.evaluarYAplicar(seller, 'ai-agent');
          }
          // Re-lectura obligatoria antes de sincronizar: evaluarYAplicar dejó
          // el veredicto en la base, pero los objetos de `saved` siguen
          // diciendo estado 'pendiente', y upsertFromSellerRow decide si corre
          // el match contra el ERP mirando ese campo. Sincronizar con el
          // objeto viejo hacía que ningún producto nuevo se matcheara nunca
          // (quedaban en sin_match con erp_match_evaluado_at en null), y por
          // eso se publicaban duplicando artículos del ERP. La rama de
          // actualización de más abajo ya hacía este re-read.
          if (proveedor) {
            const refrescados = await this.sellerRepository.find({
              where: saved.map((seller) => ({ id: seller.id })),
            });
            const porId = new Map(refrescados.map((r) => [r.id, r]));
            await Promise.allSettled(
              saved.map((seller, idx) =>
                this.sellerMongoService.upsertFromSellerRow(
                  porId.get(seller.id) ?? seller,
                  proveedor,
                  metaBatch[idx]?.categoriaNombre ?? null,
                  metaBatch[idx]?.subcategoriaNombre ?? null,
                ),
              ),
            );
          }
          entidadesBatch = [];
          metaBatch = [];
        }
        if (detalleBatch.length > 0) {
          await this.excelHistorialDetalleRepository.save(
            detalleBatch.map((d) => this.excelHistorialDetalleRepository.create(d)),
          );
          detalleBatch = [];
        }
        await this.excelHistorialRepository.update(idHistorial, { procesados: totalFilas, aceptados, rechazados, total_filas: totalFilas });
      };

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (row.actualCellCount === 0) continue;
        totalFilas++;

        const datosFila: Record<string, string> = {};
        for (const campo of this.CAMPOS_FILA_CATALOGO) datosFila[campo] = getCell(row, campo);
        for (const campo of columnasActivas) datosFila[campo] = getCell(row, campo);

        const embeddedBuffers: Partial<Record<string, Buffer>> = {};
        for (const campo of ['imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5'] as const) {
          const colIdx = colIndex[campo];
          const buffer = colIdx ? embeddedImages.get(`${i}:${colIdx}`) : undefined;
          if (buffer) embeddedBuffers[campo] = buffer;
        }

        const resultado = await this.validarFilaCatalogo(idProveedor, creadoPor, datosFila, embeddedBuffers, catalogoExistente, columnasActivas);

        if (!resultado.ok) {
          const err = IMPORT_ERROR_CODES[resultado.codigo as number];
          rechazados++;
          detalleBatch.push({
            id_historial_excel: idHistorial,
            fila: i,
            aceptado: false,
            codigo_error: err.codigo,
            motivo: err.motivo,
            solucion: err.solucion,
            datos_fila: JSON.stringify(datosFila),
          });
          continue;
        }

        // Producto que ya teníamos: se refresca todo lo que trae la fila
        // (nombre, descripción, marca, categoría, precio, stock, imágenes),
        // salvo el código interno del proveedor, que es la clave de match y
        // nunca se toca. Como marca/categoría pudieron cambiar, se vuelve a
        // evaluar con IA — un veredicto viejo no debe seguir colgado si el
        // proveedor ya corrigió lo que lo había motivado.
        if (resultado.existente && resultado.actualizacion) {
          await this.sellerRepository.update(resultado.existente.id, {
            ...resultado.actualizacion,
            estado: 'pendiente',
            codigo_rechazo: null,
            motivo_rechazo: null,
            updated_by: creadoPor,
          });

          let refrescado = await this.sellerRepository.findOne({ where: { id: resultado.existente.id } });
          if (refrescado) {
            await this.aiApproval.evaluarYAplicar(refrescado, 'ai-agent');
            refrescado = await this.sellerRepository.findOne({ where: { id: resultado.existente.id } });
          }

          if (refrescado) {
            // Mantiene sincronizada la copia en memoria que usa la similitud.
            const idx = catalogoExistente.findIndex((c) => c.id === refrescado.id);
            if (idx >= 0) catalogoExistente[idx] = refrescado;
            if (proveedor) {
              await this.sellerMongoService.upsertFromSellerRow(
                refrescado,
                proveedor,
                resultado.categoriaNombre ?? null,
                resultado.subcategoriaNombre ?? null,
              );
            }
          }

          actualizados++;
          aceptados++;
          codigosAceptados.push(resultado.codigoArticulo as string);
          detalleBatch.push({
            id_historial_excel: idHistorial,
            fila: i,
            aceptado: true,
            codigo_articulo: resultado.codigoArticulo,
          });

          if (detalleBatch.length >= IMPORT_BATCH_SIZE) await flushBatch();
          continue;
        }

        entidadesBatch.push(this.sellerRepository.create(resultado.entidad as Partial<ProductsSeller>));
        metaBatch.push({
          categoriaNombre: resultado.categoriaNombre ?? null,
          subcategoriaNombre: resultado.subcategoriaNombre ?? null,
        });
        aceptados++;
        codigosAceptados.push(resultado.codigoArticulo as string);
        detalleBatch.push({ id_historial_excel: idHistorial, fila: i, aceptado: true, codigo_articulo: resultado.codigoArticulo });

        if (entidadesBatch.length >= IMPORT_BATCH_SIZE || detalleBatch.length >= IMPORT_BATCH_SIZE) {
          await flushBatch();
        }
      }

      await flushBatch();
      await this.excelHistorialRepository.update(idHistorial, { estado: 'completado' });

      const altas = aceptados - actualizados;

      if (altas > 0) {
        await this.markPrimeraCargaProductos(idProveedor);
        await this.notificationsService.create({
          // El tipo se mantiene ('catalogo_pendiente') porque es la clave con la
          // que el header decide mostrar el panel del lote; lo que cambió es que
          // ya no hay nada pendiente de decidir, la IA resolvió todo.
          tipo: 'catalogo_pendiente',
          destinatarioTipo: 'admin',
          titulo: 'Catálogo revisado por el agente de IA',
          mensaje: `Un proveedor subió ${altas} producto(s); el agente ya emitió su veredicto.`,
          payload: { idProveedor, aceptados: altas, actualizados, codigosArticulo: codigosAceptados },
        });
      }

      await this.notificationsService.create({
        tipo: 'catalogo_procesado',
        destinatarioTipo: 'provider',
        idProveedor,
        titulo: 'Tu catálogo fue procesado',
        mensaje: `${altas} producto(s) nuevo(s), ${actualizados} actualizado(s), ${rechazados} rechazado(s).`,
        payload: { idHistorial, aceptados, altas, actualizados, rechazados },
      });
    } catch (error: any) {
      this.logger.error(`Error procesando excel de proveedor (historial ${idHistorial}): ${error.message}`);
      await this.excelHistorialRepository.update(idHistorial, { estado: 'error' }).catch(() => undefined);
      await this.notificationsService
        .create({
          tipo: 'catalogo_procesado',
          destinatarioTipo: 'provider',
          idProveedor,
          titulo: 'Hubo un problema al procesar tu catálogo',
          mensaje: 'No pudimos terminar de procesar tu excel. Intentá subirlo de nuevo.',
          payload: { idHistorial },
        })
        .catch(() => undefined);
    }
  }

  private async failImportJob(idHistorial: number, err: { codigo: number; motivo: string; solucion: string }): Promise<void> {
    await this.excelHistorialDetalleRepository.save(
      this.excelHistorialDetalleRepository.create({
        id_historial_excel: idHistorial,
        fila: 0,
        aceptado: false,
        codigo_error: err.codigo,
        motivo: err.motivo,
        solucion: err.solucion,
      }),
    );
    await this.excelHistorialRepository.update(idHistorial, { estado: 'error', total_filas: 0, rechazados: 1 });
  }

  async listPendientes(idProveedor?: number, estado: string = 'pendiente'): Promise<{ data: ProductsSeller[]; message: string; success: boolean }> {
    try {
      const where: any = { estado };
      if (idProveedor) where.id_proveedor = idProveedor;
      const data = await this.sellerRepository.find({ where, order: { created_at: 'DESC' } });
      return { data, message: 'Ok', success: true };
    } catch (error: any) {
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
    } catch (error: any) {
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async approve(
    id: number,
    modificadoPor: string,
    correccion?: {
      codigo_marca?: string;
      codigo_categoria?: string;
      codigo_subcategoria?: string;
    },
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

      await this.notificationsService.create({
        tipo: 'producto_aprobado',
        destinatarioTipo: 'provider',
        idProveedor: seller.id_proveedor,
        titulo: `Producto aprobado: ${seller.nombre_articulo}`,
        mensaje: `Tu producto "${seller.nombre_articulo}" fue aprobado y ya está publicado.`,
        payload: { id: seller.id, codigo_articulo: seller.codigo_articulo },
      });

      return { data, message: 'Producto aprobado', success: true };
    } catch (error: any) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async listHistorialExcel(idProveedor: number): Promise<{ data: ProductsExcelHistorial[]; message: string; success: boolean }> {
    try {
      const data = await this.excelHistorialRepository.find({
        where: { id_proveedor: idProveedor },
        order: { created_at: 'DESC' },
      });
      return { data, message: 'Ok', success: true };
    } catch (error: any) {
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async getHistorialDetalle(
    idHistorial: number,
    idProveedor: number,
    page = 1,
    limit = 20,
    soloRechazados = false,
  ): Promise<{ data: ProductsExcelHistorialDetalle[]; total: number; message: string; success: boolean }> {
    try {
      const historial = await this.excelHistorialRepository.findOne({ where: { id: idHistorial, id_proveedor: idProveedor } });
      if (!historial) return { data: [], total: 0, message: 'Historial no encontrado', success: false };

      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
      const safePage = Math.max(Number(page) || 1, 1);

      const where: any = { id_historial_excel: idHistorial };
      if (soloRechazados) where.aceptado = false;

      const [data, total] = await this.excelHistorialDetalleRepository.findAndCount({
        where,
        order: { fila: 'ASC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });
      return { data, total, message: 'Ok', success: true };
    } catch (error: any) {
      return { data: [], total: 0, message: `Error: ${error.message}`, success: false };
    }
  }

  async retryHistorialDetalleRow(
    idDetalle: number,
    idProveedor: number,
    modificadoPor: string,
    correccion: Record<string, string>,
  ): Promise<{ data: ProductsSeller | null; message: string; success: boolean }> {
    try {
      const detalle = await this.excelHistorialDetalleRepository.findOne({ where: { id: idDetalle } });
      if (!detalle) return { data: null, message: 'Fila no encontrada', success: false };
      if (detalle.aceptado) return { data: null, message: 'Esta fila ya fue aceptada, no hace falta reintentarla', success: false };

      const historial = await this.excelHistorialRepository.findOne({ where: { id: detalle.id_historial_excel, id_proveedor: idProveedor } });
      if (!historial) return { data: null, message: 'Historial no encontrado', success: false };

      let datosOriginales: Record<string, string> = {};
      if (detalle.datos_fila) {
        try {
          datosOriginales = JSON.parse(detalle.datos_fila);
        } catch {
          datosOriginales = {};
        }
      }

      const datosFinales: Record<string, string> = { ...datosOriginales, ...correccion };
      const resultado = await this.validarFilaCatalogo(idProveedor, modificadoPor, datosFinales, {});

      if (!resultado.ok) {
        const err = IMPORT_ERROR_CODES[resultado.codigo as number];
        await this.excelHistorialDetalleRepository.update(idDetalle, {
          codigo_error: err.codigo,
          motivo: err.motivo,
          solucion: err.solucion,
          datos_fila: JSON.stringify(datosFinales),
        });
        return { data: null, message: err.motivo, success: false };
      }

      if (resultado.existente && resultado.actualizacion) {
        await this.sellerRepository.update(resultado.existente.id, {
          stock_actual: resultado.actualizacion.stock_actual,
          costo: resultado.actualizacion.costo,
          precioventa: resultado.actualizacion.precioventa,
          updated_by: modificadoPor,
        });

        const actualizado = await this.sellerRepository.findOne({ where: { id: resultado.existente.id } });
        const proveedorExistente = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
        if (actualizado && proveedorExistente) {
          await this.sellerMongoService.upsertFromSellerRow(
            actualizado,
            proveedorExistente,
            resultado.categoriaNombre ?? null,
            resultado.subcategoriaNombre ?? null,
          );
        }

        await this.excelHistorialDetalleRepository.update(idDetalle, {
          aceptado: true,
          codigo_articulo: resultado.codigoArticulo,
          codigo_error: null,
          motivo: null,
          solucion: null,
          datos_fila: JSON.stringify(datosFinales),
        });

        return { data: actualizado, message: 'El producto ya existía: se actualizaron stock y precio', success: true };
      }

      const seller = await this.sellerRepository.save(this.sellerRepository.create(resultado.entidad as Partial<ProductsSeller>));
      await this.sellerRepository.update((seller as ProductsSeller).id, { id_historial_excel: historial.id });

      const proveedor = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
      if (proveedor) {
        await this.sellerMongoService.upsertFromSellerRow(
          seller as ProductsSeller,
          proveedor,
          resultado.categoriaNombre ?? null,
          resultado.subcategoriaNombre ?? null,
        );
      }

      await this.excelHistorialDetalleRepository.update(idDetalle, {
        aceptado: true,
        codigo_articulo: resultado.codigoArticulo,
        codigo_error: null,
        motivo: null,
        solucion: null,
        datos_fila: JSON.stringify(datosFinales),
      });
      await this.excelHistorialRepository.update(historial.id, {
        aceptados: historial.aceptados + 1,
        rechazados: Math.max(historial.rechazados - 1, 0),
      });

      await this.aiApproval.evaluarYAplicar(seller as ProductsSeller, 'ai-agent');

      const data = await this.sellerRepository.findOne({ where: { id: (seller as ProductsSeller).id } });
      return { data, message: 'Fila corregida y aceptada', success: true };
    } catch (error: any) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async getExcelHistorialStatus(
    idHistorial: number,
    idProveedor: number,
  ): Promise<{ data: { estado: string; procesados: number; total_filas: number; aceptados: number; rechazados: number } | null; message: string; success: boolean }> {
    try {
      const historial = await this.excelHistorialRepository.findOne({ where: { id: idHistorial, id_proveedor: idProveedor } });
      if (!historial) return { data: null, message: 'Historial no encontrado', success: false };
      return {
        data: {
          estado: historial.estado,
          procesados: historial.procesados,
          total_filas: historial.total_filas,
          aceptados: historial.aceptados,
          rechazados: historial.rechazados,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error: any) {
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async downloadHistorialExcel(
    idHistorial: number,
    idProveedor: number,
  ): Promise<{ buffer: Buffer | null; nombreArchivo: string | null; message: string; success: boolean }> {
    try {
      const historial = await this.excelHistorialRepository.findOne({ where: { id: idHistorial, id_proveedor: idProveedor } });
      if (!historial) return { buffer: null, nombreArchivo: null, message: 'Historial no encontrado', success: false };
      if (!historial.storage_key) {
        return { buffer: null, nombreArchivo: null, message: 'El archivo original no está disponible para este registro', success: false };
      }

      const { buffer } = await this.imageStorage.getObjectBuffer(historial.storage_key);
      return { buffer, nombreArchivo: historial.nombre_archivo_original, message: 'Ok', success: true };
    } catch (error: any) {
      return { buffer: null, nombreArchivo: null, message: `Error: ${error.message}`, success: false };
    }
  }

  async validateSellerImage(
    idProveedor: number,
    codigoArticulo: string,
    campo: string,
    payload: { url?: string; buffer?: Buffer },
  ): Promise<{ success: boolean; url: string | null; message: string }> {
    if (payload.buffer) {
      return this.sellerImageValidator.validateAndUploadFromBuffer(payload.buffer, idProveedor, codigoArticulo, campo);
    }
    if (payload.url) {
      return this.sellerImageValidator.validateAndUploadFromUrl(payload.url, idProveedor, codigoArticulo, campo);
    }
    return { success: false, url: null, message: 'Falta la URL o el archivo de la imagen.' };
  }

  getRejectionCodes() {
    return { data: Object.values(REJECTION_CODES), message: 'Ok', success: true };
  }

  getImportErrorCodes() {
    return { data: getImportErrorCodesList(), message: 'Ok', success: true };
  }

  async listFamilias(): Promise<{ data: { codigo: string; nombre: string }[]; message: string; success: boolean }> {
    const data = await this.sellersUtils.listFamilias();
    return { data, message: 'Ok', success: true };
  }

  async listSubfamilias(codigoCategoria: string): Promise<{ data: { codigo: string; nombre: string }[]; message: string; success: boolean }> {
    const data = await this.sellersUtils.listSubfamilias(codigoCategoria);
    return { data, message: 'Ok', success: true };
  }

  async getSellerImageFile(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!key || !key.startsWith('products/seller-images/') || key.includes('..')) {
      throw new Error('Clave de imagen inválida');
    }
    const { buffer, contentType } = await this.imageStorage.getObjectBuffer(key);
    return { buffer, contentType: contentType || 'image/webp' };
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
    } catch (error: any) {
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

      // El proveedor corrige su costo; el precio de venta se recalcula acá con
      // el recargo vigente, nunca se toma tal cual de la corrección.
      const costoCorregido = Number(correccion.costo ?? seller.costo ?? 0) || null;
      const categoriaCorregida = correccion.codigo_categoria ?? seller.codigo_categoria;
      const subcategoriaCorregida = correccion.codigo_subcategoria ?? seller.codigo_subcategoria;
      const recargoCorregido = await this.sellersUtils.getRecargo(categoriaCorregida, subcategoriaCorregida);
      const precioventaCorregido = costoCorregido
        ? Math.round(costoCorregido * (1 + recargoCorregido / 100) * 100) / 100
        : seller.precioventa;

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
        costo: costoCorregido,
        precioventa: precioventaCorregido,
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

      let actualizado = await this.sellerRepository.findOne({ where: { id } });
      if (actualizado) {
        await this.aiApproval.evaluarYAplicar(actualizado, 'ai-agent');
        actualizado = await this.sellerRepository.findOne({ where: { id } });
      }

      if (actualizado) {
        const proveedorFila = await this.proveedorRepository.findOne({ where: { id: idProveedor } });
        if (proveedorFila) {
          const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
            actualizado.codigo_categoria,
            actualizado.codigo_subcategoria,
          );
          await this.sellerMongoService.upsertFromSellerRow(actualizado, proveedorFila, categoriaNombre, subcategoriaNombre);
        }
      }

      actualizados++;
      detalle.push({ fila: id, aceptado: true, codigo_articulo: seller.codigo_articulo });
    }

    if (actualizados > 0) {
      await this.notificationsService.create({
        tipo: 'catalogo_reenviado',
        destinatarioTipo: 'admin',
        titulo: 'Productos reenviados a revisión',
        mensaje: `El proveedor reenvió ${actualizados} producto(s) corregido(s) para revisión.`,
        payload: { idProveedor, actualizados, ids: detalle.filter((d) => d.aceptado).map((d) => d.fila) },
      });
    }

    return {
      data: { actualizados, detalle },
      message: `${actualizados} de ${ids.length} producto(s) reenviados a revisión`,
      success: true,
    };
  }

  async repararMojibakeProductsSellers(): Promise<{ data: { revisados: number; corregidos: number }; message: string; success: boolean }> {
    const todos = await this.sellerRepository.find();
    let corregidos = 0;
    for (const seller of todos) {
      const fixes: Partial<ProductsSeller> = {};
      const nombreFix = repararMojibake(seller.nombre_articulo);
      if (nombreFix !== seller.nombre_articulo) fixes.nombre_articulo = nombreFix;
      const descFix = repararMojibake(seller.descripcion || '');
      if (descFix !== (seller.descripcion || '')) fixes.descripcion = descFix;
      const marcaTextoFix = repararMojibake(seller.marca_texto_original || '');
      if (marcaTextoFix !== (seller.marca_texto_original || '')) fixes.marca_texto_original = marcaTextoFix;
      const marcaSugeridaFix = repararMojibake(seller.marca_sugerida || '');
      if (marcaSugeridaFix !== (seller.marca_sugerida || '')) fixes.marca_sugerida = marcaSugeridaFix;

      if (Object.keys(fixes).length > 0) {
        await this.sellerRepository.update(seller.id, fixes);
        corregidos++;
      }
    }
    return {
      data: { revisados: todos.length, corregidos },
      message: `${corregidos} de ${todos.length} producto(s) tenían texto corrupto y fueron corregidos`,
      success: true,
    };
  }

  // Backfill: re-sincroniza a Mongo (colección legacy "productos" que sigue
  // leyendo el storefront viejo en producción) todos los productos ya
  // aprobados de todos los proveedores, incluyendo la re-subida de sus
  // imágenes al bucket viejo. Es idempotente (upsert por código), pensado
  // para correrse una sola vez tras desplegar el fix del sync a Mongo.
  async resyncAprobadosAMongo(): Promise<{ data: { procesados: number; errores: number }; message: string; success: boolean }> {
    await this.repararMojibakeProductsSellers();
    const aprobados = await this.sellerRepository.find({ where: { estado: 'aprobado' } });
    let procesados = 0;
    let errores = 0;
    for (const seller of aprobados) {
      try {
        const proveedor = await this.proveedorRepository.findOne({ where: { id: seller.id_proveedor } });
        if (!proveedor) {
          errores++;
          continue;
        }
        const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
          seller.codigo_categoria,
          seller.codigo_subcategoria,
        );
        await this.sellerMongoService.backfillSellerRow(seller, proveedor, categoriaNombre, subcategoriaNombre);
        procesados++;
      } catch (err: any) {
        this.logger.error(`resyncAprobadosAMongo: error en ${seller.codigo_articulo}: ${err?.message || err}`);
        errores++;
      }
    }
    return {
      data: { procesados, errores },
      message: `${procesados} producto(s) re-sincronizados a Mongo (${errores} error(es))`,
      success: true,
    };
  }

  // El catálogo ERP crece con el tiempo (un producto de proveedor se compra y
  // recién ahí se carga en articulo) — un seller que hoy no matchea puede
  // empezar a matchear más adelante. Cada noche, re-evalúa con Claude solo los
  // aprobados que siguen en 'sin_match' (los ya matcheados o en revisión no
  // se vuelven a evaluar) y, si alguno pasa a match_automatico o
  // revision_manual, empuja el cambio a Mongo de inmediato (oculta del
  // storefront sin esperar a que el proveedor edite el producto).
  @Cron('0 3 * * *')
  async reevaluarMatchesPendientes(): Promise<{ data: { reevaluados: number; cambios: number }; message: string; success: boolean }> {
    const pendientes = await this.sellerRepository.find({ where: { estado: 'aprobado', erp_match_status: 'sin_match' } });
    let cambios = 0;
    for (const seller of pendientes) {
      try {
        const resultado = await this.erpMatchService.evaluarMatch(seller);
        if (resultado.status === 'sin_match') continue;

        seller.erp_match_status = resultado.status;
        seller.erp_articulo_match = resultado.codigoArticulo;
        seller.erp_match_score = resultado.score;
        seller.erp_match_motivo = resultado.motivo;

        const proveedor = await this.proveedorRepository.findOne({ where: { id: seller.id_proveedor } });
        if (!proveedor) continue;
        const { categoriaNombre, subcategoriaNombre } = await this.sellersUtils.getNombresCategoria(
          seller.codigo_categoria,
          seller.codigo_subcategoria,
        );
        await this.sellerMongoService.upsertFromSellerRow(seller, proveedor, categoriaNombre, subcategoriaNombre);
        cambios++;
      } catch (err: any) {
        this.logger.error(`reevaluarMatchesPendientes: error en ${seller.codigo_articulo}: ${err?.message || err}`);
      }
    }
    return {
      data: { reevaluados: pendientes.length, cambios },
      message: `${pendientes.length} producto(s) pendiente(s) re-evaluados, ${cambios} pasaron a match/revisión`,
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
