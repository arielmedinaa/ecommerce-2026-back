import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../schemas/product.schemas';
import { CmsCombo } from '../schemas/cms-combo.schemas';
import { CmsComboDetalle } from '../schemas/cms-combo-detalle.schemas';
import { EcontComboImagen } from '../schemas/econt-combo-imagen.schemas';
import { CreateCmsComboDto } from '../schemas/dto/create-cms-combo.dto';
import { UpdateCmsComboDto } from '../schemas/dto/update-cms-combo.dto';
import { CircuitBreaker } from '@shared/common/decorators/circuit-breaker.decorator';
import { ImageStorageService } from '@shared/common/services/image-storage.service';

interface MulterFile {
  originalname: string;
  buffer: Buffer | { data: any } | string;
}

export interface EcontComboCuota {
  cuota: number;
  precio: number;
  precioOriginal: number | null;
}

export interface EcontComboDetalleRow {
  codigoArticulo: string;
  cantidad: number;
}

export interface EcontCombo {
  idCombo: number;
  nombreCombo: string;
  categoria: string | null;
  precioRegular: number;
  detalles: EcontComboDetalleRow[];
  contado: number | null;
  original: number | null;
  cuotas: EcontComboCuota[];
  disponibleEcommerce: number | null;
  imagen: string | null;
}

@Injectable()
export class CombosService {
  private readonly logger = new Logger(CombosService.name);

  private readonly ECONT_CACHE_TTL = 5 * 60 * 1000;
  private econtCache = new Map<string, { data: any; timestamp: number }>();
  private readonly econtBreaker = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 20000,
  });

  constructor(
    @InjectRepository(CmsCombo, 'COMBOS_CONNECTION')
    private readonly comboWriteRepository: Repository<CmsCombo>,
    @InjectRepository(CmsCombo, 'COMBOS_CONNECTION_READ')
    private readonly comboReadRepository: Repository<CmsCombo>,
    @InjectRepository(CmsComboDetalle, 'COMBOS_CONNECTION')
    private readonly comboDetalleWriteRepository: Repository<CmsComboDetalle>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    @InjectRepository(EcontComboImagen, 'COMBOS_CONNECTION')
    private readonly econtComboImagenWriteRepository: Repository<EcontComboImagen>,
    @InjectRepository(EcontComboImagen, 'COMBOS_CONNECTION_READ')
    private readonly econtComboImagenReadRepository: Repository<EcontComboImagen>,
    private readonly imageStorage: ImageStorageService,
  ) {}

  private readonly baseUrl = String(process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');

  async uploadComboImage(
    id: number,
    file: MulterFile,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const combo = await this.comboReadRepository.findOne({ where: { id }, relations: ['detalles'] });
      if (!combo) {
        return { data: null, message: 'Combo no encontrado', success: false };
      }

      let bufferData: Buffer;
      if (Buffer.isBuffer(file.buffer)) {
        bufferData = file.buffer;
      } else if (file.buffer && typeof file.buffer === 'object' && 'data' in file.buffer) {
        const dataProperty = (file.buffer as any).data;
        bufferData = Buffer.isBuffer(dataProperty)
          ? dataProperty
          : typeof dataProperty === 'string'
            ? Buffer.from(dataProperty, 'base64')
            : Buffer.from(dataProperty);
      } else if (typeof file.buffer === 'string') {
        bufferData = Buffer.from(file.buffer, 'base64');
      } else {
        throw new Error(`Formato de archivo inválido: ${typeof file.buffer}`);
      }

      const extension = file.originalname.split('.').pop() || 'webp';
      const fileName = `combo_${id}_${Date.now()}.${extension}`;

      await this.imageStorage.putObject({
        key: `products/images/${fileName}`,
        body: bufferData,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=86400',
      });

      combo.imagen = `${this.baseUrl}/products/images/${fileName}`;
      const updated = await this.comboWriteRepository.save(combo);

      return { data: updated, message: 'Imagen del combo subida exitosamente', success: true };
    } catch (error) {
      this.logger.error('Error uploadComboImage', error);
      return { data: null, message: `Error al subir la imagen del combo: ${error.message}`, success: false };
    }
  }

  async uploadEcontComboImage(
    idCombo: number,
    file: MulterFile,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      let bufferData: Buffer;
      if (Buffer.isBuffer(file.buffer)) {
        bufferData = file.buffer;
      } else if (file.buffer && typeof file.buffer === 'object' && 'data' in file.buffer) {
        const dataProperty = (file.buffer as any).data;
        bufferData = Buffer.isBuffer(dataProperty)
          ? dataProperty
          : typeof dataProperty === 'string'
            ? Buffer.from(dataProperty, 'base64')
            : Buffer.from(dataProperty);
      } else if (typeof file.buffer === 'string') {
        bufferData = Buffer.from(file.buffer, 'base64');
      } else {
        throw new Error(`Formato de archivo inválido: ${typeof file.buffer}`);
      }

      const extension = file.originalname.split('.').pop() || 'webp';
      const fileName = `econt_combo_${idCombo}_${Date.now()}.${extension}`;

      await this.imageStorage.putObject({
        key: `products/images/${fileName}`,
        body: bufferData,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=86400',
      });

      const imagen = `${this.baseUrl}/products/images/${fileName}`;
      const existing = await this.econtComboImagenReadRepository.findOne({ where: { idCombo } });
      const saved = await this.econtComboImagenWriteRepository.save(
        this.econtComboImagenWriteRepository.create({ ...existing, idCombo, imagen }),
      );

      this.econtCache.clear();

      return { data: saved, message: 'Imagen del combo ERP subida exitosamente', success: true };
    } catch (error) {
      this.logger.error('Error uploadEcontComboImage', error);
      return { data: null, message: `Error al subir la imagen del combo: ${error.message}`, success: false };
    }
  }

  async createCmsCombo(
    dto: CreateCmsComboDto,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const combo = this.comboWriteRepository.create({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioVenta: dto.precioVenta,
        imagen: dto.imagen,
        categoria: dto.categoria,
        activo: dto.activo !== undefined ? dto.activo : true,
        fechaDesde: dto.fechaDesde ? new Date(dto.fechaDesde) : null,
        fechaHasta: dto.fechaHasta ? new Date(dto.fechaHasta) : null,
        createdBy: dto.createdBy,
      });
      const savedCombo = await this.comboWriteRepository.save(combo);

      const detalles = (dto.detalles || []).map(d =>
        this.comboDetalleWriteRepository.create({
          combo: savedCombo,
          codigoArticulo: d.codigoArticulo,
          nombreArticulo: d.nombreArticulo,
          cantidad: d.cantidad || 1,
        }),
      );
      savedCombo.detalles = await this.comboDetalleWriteRepository.save(detalles);

      return { data: savedCombo, message: 'COMBO CREADO EXITOSAMENTE', success: true };
    } catch (error) {
      this.logger.error('Error createCmsCombo', error);
      return { data: null, message: `Error al crear el combo: ${error.message}`, success: false };
    }
  }

  async updateCmsCombo(
    id: number,
    dto: UpdateCmsComboDto,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const existing = await this.comboReadRepository.findOne({
        where: { id },
        relations: ['detalles'],
      });
      if (!existing) {
        return { data: null, message: 'COMBO NO ENCONTRADO', success: false };
      }

      existing.nombre = dto.nombre ?? existing.nombre;
      existing.descripcion = dto.descripcion ?? existing.descripcion;
      existing.precioVenta = dto.precioVenta ?? existing.precioVenta;
      existing.imagen = dto.imagen ?? existing.imagen;
      existing.categoria = dto.categoria ?? existing.categoria;
      existing.activo = dto.activo !== undefined ? dto.activo : existing.activo;
      existing.fechaDesde = dto.fechaDesde !== undefined
        ? (dto.fechaDesde ? new Date(dto.fechaDesde) : null)
        : existing.fechaDesde;
      existing.fechaHasta = dto.fechaHasta !== undefined
        ? (dto.fechaHasta ? new Date(dto.fechaHasta) : null)
        : existing.fechaHasta;
      existing.updatedBy = dto.updatedBy ?? existing.updatedBy;

      if (dto.detalles) {
        await this.comboDetalleWriteRepository.remove(existing.detalles);
        const nuevosDetalles = dto.detalles.map(d =>
          this.comboDetalleWriteRepository.create({
            combo: existing,
            codigoArticulo: d.codigoArticulo,
            nombreArticulo: d.nombreArticulo,
            cantidad: d.cantidad || 1,
          }),
        );
        existing.detalles = await this.comboDetalleWriteRepository.save(nuevosDetalles);
      }

      const updated = await this.comboWriteRepository.save(existing);
      return { data: updated, message: 'COMBO ACTUALIZADO EXITOSAMENTE', success: true };
    } catch (error) {
      this.logger.error('Error updateCmsCombo', error);
      return { data: null, message: `Error al actualizar el combo: ${error.message}`, success: false };
    }
  }

  async getCmsComboById(id: number): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const combo = await this.comboReadRepository.findOne({
        where: { id },
        relations: ['detalles'],
      });
      if (!combo) {
        return { data: null, message: 'Combo no encontrado', success: false };
      }
      return { data: combo, message: 'Combo encontrado', success: true };
    } catch (error) {
      return { data: null, message: `Error al obtener el combo: ${error.message}`, success: false };
    }
  }

  async getCmsCombos(filters: {
    limit: number;
    offset: number;
    activo?: boolean;
  }): Promise<{ data: any[]; message: string; success: boolean }> {
    try {
      const where: any = {};
      if (filters?.activo !== undefined) where.activo = filters.activo;

      const combos = await this.comboReadRepository.find({
        where,
        relations: ['detalles'],
        order: { createdAt: 'DESC' },
        take: filters?.limit,
        skip: filters?.offset,
      });

      return { data: combos, message: 'Combos obtenidos exitosamente', success: true };
    } catch (error) {
      return { data: [], message: `Error al obtener los combos: ${error.message}`, success: false };
    }
  }

  async deleteCmsCombo(id: number): Promise<{ data: null; message: string; success: boolean }> {
    try {
      const combo = await this.comboReadRepository.findOne({ where: { id }, relations: ['detalles'] });
      if (!combo) {
        return { data: null, message: 'Combo no encontrado', success: false };
      }
      await this.comboWriteRepository.remove(combo);
      return { data: null, message: 'Combo eliminado exitosamente', success: true };
    } catch (error) {
      return { data: null, message: `Error al eliminar el combo: ${error.message}`, success: false };
    }
  }

  async toggleCmsComboStatus(id: number): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const combo = await this.comboReadRepository.findOne({ where: { id }, relations: ['detalles'] });
      if (!combo) {
        return { data: null, message: 'Combo no encontrado', success: false };
      }
      combo.activo = !combo.activo;
      const updated = await this.comboWriteRepository.save(combo);
      return {
        data: updated,
        message: `Combo ${updated.activo ? 'activado' : 'desactivado'} exitosamente`,
        success: true,
      };
    } catch (error) {
      return { data: null, message: `Error al cambiar el estado del combo: ${error.message}`, success: false };
    }
  }

  async listEcontCombosPromotions(): Promise<any[]> {
    return this.econtBreaker.execute(
      async () => {
        const rows = await this.productReadRepository.query(
          `SELECT DISTINCT pc.id_promo, pc.nombre, pc.fecha_inicio, pc.fecha_fin, pc.canal, pc.tipo_promocion, pc.estado
             FROM tbl_promos_cabeceras pc
             JOIN tbl_promos_detalles pd ON pd.id_promo = pc.id_promo
            WHERE pd.tipo_codigo = 2
              AND pd.estado = 1
              AND pc.estado = 1
              AND pc.canal IN ('ambos', 'ecommerce')
              AND CURDATE() BETWEEN pc.fecha_inicio AND pc.fecha_fin
            ORDER BY pc.fecha_fin ASC`,
        );
        this.econtCache.set('promotions', { data: rows, timestamp: Date.now() });
        return rows;
      },
      async () => {
        const cached = this.econtCache.get('promotions');
        if (cached) {
          this.logger.warn('ECONT no disponible: sirviendo promos con combos desde cache');
          return cached.data;
        }
        this.logger.warn('ECONT no disponible y sin cache previa: se devuelve lista vacía de promos con combos');
        return [];
      },
    );
  }

  async getEcontCombosForPromo(idPromo: number): Promise<EcontCombo[]> {
    const cacheKey = `promo:${idPromo}`;
    const cached = this.econtCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.ECONT_CACHE_TTL) {
      return cached.data;
    }

    return this.econtBreaker.execute(
      async () => {
        const rows = await this.productReadRepository.query(
          `SELECT cc.id_combo, cc.nombre_combo, cc.precio_venta AS precio_regular, cc.categoria,
                  cd.codigo_articulo, cd.cantidad,
                  pd.cantidad_cuotas, pd.precio_venta AS precio_promo, pd.precio_original, pd.disponible_ecommerce
             FROM tbl_combo_cabecera cc
             JOIN tbl_combo_detalle cd ON cd.id_combo = cc.id_combo AND cd.estado = 1
             JOIN tbl_promos_detalles pd ON pd.codigo_identificador = cc.id_combo AND pd.tipo_codigo = 2 AND pd.estado = 1
             JOIN tbl_promos_cabeceras pc ON pc.id_promo = pd.id_promo
            WHERE pd.id_promo = ?
              AND cc.estado = 2
              AND pc.estado = 1
              AND pc.canal IN ('ambos', 'ecommerce')
              AND CURDATE() BETWEEN pc.fecha_inicio AND pc.fecha_fin`,
          [idPromo],
        );

        const combos = this.groupEcontComboRows(rows as any[]);
        await this.attachEcontComboImages(combos);
        this.econtCache.set(cacheKey, { data: combos, timestamp: Date.now() });
        return combos;
      },
      async () => {
        const stale = this.econtCache.get(cacheKey);
        if (stale) {
          this.logger.warn(`ECONT no disponible: sirviendo combos de promo ${idPromo} desde cache (posiblemente vencida)`);
          return stale.data;
        }
        this.logger.warn(`ECONT no disponible y sin cache previa para promo ${idPromo}: se devuelve lista vacía`);
        return [];
      },
    );
  }

  private async attachEcontComboImages(combos: EcontCombo[]): Promise<void> {
    if (combos.length === 0) return;
    const imagenes = await this.econtComboImagenReadRepository.find({
      where: combos.map(c => ({ idCombo: c.idCombo })),
    });
    const imagenPorCombo = new Map(imagenes.map(i => [i.idCombo, i.imagen]));
    for (const combo of combos) {
      combo.imagen = imagenPorCombo.get(combo.idCombo) ?? null;
    }
  }

  private groupEcontComboRows(rows: any[]): EcontCombo[] {
    const map = new Map<number, EcontCombo>();
    const detallesSeen = new Map<number, Set<string>>();

    for (const row of rows) {
      const idCombo = Number(row.id_combo);
      let combo = map.get(idCombo);
      if (!combo) {
        combo = {
          idCombo,
          nombreCombo: row.nombre_combo,
          categoria: row.categoria ?? null,
          precioRegular: Number(row.precio_regular),
          detalles: [],
          contado: null,
          original: null,
          cuotas: [],
          disponibleEcommerce: null,
          imagen: null,
        };
        map.set(idCombo, combo);
        detallesSeen.set(idCombo, new Set());
      }

      const detalleKey = String(row.codigo_articulo);
      const seen = detallesSeen.get(idCombo)!;
      if (!seen.has(detalleKey)) {
        seen.add(detalleKey);
        combo.detalles.push({
          codigoArticulo: detalleKey,
          cantidad: Number(row.cantidad),
        });
      }

      const cuota = Number(row.cantidad_cuotas);
      const precio = Number(row.precio_promo);
      const precioOriginal =
        row.precio_original === null || row.precio_original === undefined
          ? null
          : Number(row.precio_original);
      const disponible =
        row.disponible_ecommerce === null || row.disponible_ecommerce === undefined
          ? null
          : Number(row.disponible_ecommerce);

      if (cuota === 0) {
        if (combo.contado === null || precio < combo.contado) {
          combo.contado = precio;
          combo.original = precioOriginal;
        }
      } else if (!combo.cuotas.some(c => c.cuota === cuota)) {
        combo.cuotas.push({ cuota, precio, precioOriginal });
      }

      if (disponible !== null && (combo.disponibleEcommerce === null || disponible < combo.disponibleEcommerce)) {
        combo.disponibleEcommerce = disponible;
      }
    }

    return Array.from(map.values());
  }
}
