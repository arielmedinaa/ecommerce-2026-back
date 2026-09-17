import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { SellosRegla } from '../../schemas/products/sellos-regla.schema';
import { ProductsSello } from '../../schemas/products/products-sello.schema';
import { ProductsImagesService } from './products-images.service';
import { ProductsService } from './products.service';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface SelloReglaFiltro {
  categoria?: string | null;
  marca?: string | null;
  proveedor?: string | null;
  precioMin?: number | string | null;
  precioMax?: number | string | null;
}

// Reglas "vivas" de sello por filtro: se define un filtro (categoría/marca/proveedor/precio)
// y un cron mantiene productos_sello sincronizado con los artículos que matchean ese filtro
// en cada momento — se agrega el sello a productos nuevos que empiezan a matchear y se
// retira de los que dejan de matchear o cuando vence la vigencia de la regla.
@Injectable()
export class SellosReglasService {
  private readonly logger = new Logger(SellosReglasService.name);

  constructor(
    @InjectRepository(SellosRegla, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly reglaWriteRepository: Repository<SellosRegla>,
    @InjectRepository(SellosRegla, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly reglaReadRepository: Repository<SellosRegla>,
    @InjectRepository(ProductsSello, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly selloWriteRepository: Repository<ProductsSello>,
    @InjectRepository(ProductsSello, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly selloReadRepository: Repository<ProductsSello>,
    private readonly productsImagesService: ProductsImagesService,
    private readonly productsService: ProductsService,
  ) {}

  private hasAnyFiltro(filtro: SelloReglaFiltro): boolean {
    return !!(
      filtro?.categoria ||
      filtro?.marca ||
      filtro?.proveedor ||
      filtro?.precioMin ||
      filtro?.precioMax
    );
  }

  private isVigente(regla: Pick<SellosRegla, 'activo' | 'fecha_desde' | 'fecha_hasta'>, now = new Date()): boolean {
    if (!regla.activo) return false;
    if (regla.fecha_desde && new Date(regla.fecha_desde) > now) return false;
    if (regla.fecha_hasta && new Date(regla.fecha_hasta) < now) return false;
    return true;
  }

  async previewCount(filtro: SelloReglaFiltro): Promise<{ total: number }> {
    const total = await this.productsService.getFilteredProductsCount({
      categoria: filtro?.categoria || undefined,
      marca: filtro?.marca || undefined,
      proveedor: filtro?.proveedor || undefined,
      precioMin: filtro?.precioMin ?? undefined,
      precioMax: filtro?.precioMax ?? undefined,
    });
    return { total };
  }

  async createRegla(payload: {
    filtro: SelloReglaFiltro;
    nombre?: string | null;
    file: MulterFile;
    fechaDesde?: string | null;
    fechaHasta?: string | null;
    userId?: string;
  }): Promise<{ data: any; message: string; success: boolean }> {
    if (!this.hasAnyFiltro(payload.filtro)) {
      throw new BadRequestException(
        'Elegí al menos un filtro (categoría, marca, proveedor o precio) para crear un sello por filtro.',
      );
    }

    const { fileName, cdnUrl } = await this.productsImagesService.storeSelloFile(
      payload.file,
      'sello_regla',
    );

    const regla = await this.reglaWriteRepository.save(
      this.reglaWriteRepository.create({
        nombre: payload.nombre || null,
        filtro_categoria: payload.filtro?.categoria || null,
        filtro_marca: payload.filtro?.marca || null,
        filtro_proveedor: payload.filtro?.proveedor || null,
        filtro_precio_min:
          payload.filtro?.precioMin === undefined || payload.filtro?.precioMin === null || payload.filtro?.precioMin === ''
            ? null
            : Number(payload.filtro.precioMin),
        filtro_precio_max:
          payload.filtro?.precioMax === undefined || payload.filtro?.precioMax === null || payload.filtro?.precioMax === ''
            ? null
            : Number(payload.filtro.precioMax),
        url_sello: cdnUrl,
        nombre_archivo: fileName,
        fecha_desde: payload.fechaDesde ? new Date(payload.fechaDesde) : null,
        fecha_hasta: payload.fechaHasta ? new Date(payload.fechaHasta) : null,
        created_by: payload.userId,
      }),
    );

    const { matched } = await this.syncRegla(regla);
    this.logger.log(`Regla de sello #${regla.id} creada: aplicada a ${matched} producto(s).`);
    return {
      data: regla,
      message: `Sello aplicado a ${matched} producto${matched === 1 ? '' : 's'}.`,
      success: true,
    };
  }

  async listReglas(): Promise<any[]> {
    const reglas = await this.reglaReadRepository.find({ order: { created_at: 'DESC' } });
    if (!reglas.length) return [];

    const counts = await this.selloReadRepository
      .createQueryBuilder('s')
      .select('s.regla_id', 'regla_id')
      .addSelect('COUNT(*)', 'total')
      .where('s.regla_id IS NOT NULL')
      .groupBy('s.regla_id')
      .getRawMany();
    const countMap = new Map(counts.map((c) => [Number(c.regla_id), Number(c.total)]));
    const now = new Date();

    return reglas.map((r) => ({
      ...r,
      productos_afectados: countMap.get(r.id) || 0,
      vigente: this.isVigente(r, now),
    }));
  }

  async toggleRegla(id: number, activo: boolean, userId?: string): Promise<{ success: boolean; message: string }> {
    const regla = await this.reglaReadRepository.findOne({ where: { id } });
    if (!regla) throw new NotFoundException(`Regla de sello #${id} no encontrada`);

    await this.reglaWriteRepository.update({ id }, { activo, updated_by: userId });
    regla.activo = activo;
    const { matched } = await this.syncRegla(regla);

    return {
      success: true,
      message: activo
        ? `Regla activada: aplicada a ${matched} producto${matched === 1 ? '' : 's'}.`
        : 'Regla pausada: sello retirado de los productos.',
    };
  }

  async deleteRegla(id: number): Promise<{ success: boolean; message: string }> {
    const regla = await this.reglaReadRepository.findOne({ where: { id } });
    if (!regla) throw new NotFoundException(`Regla de sello #${id} no encontrada`);

    await this.selloWriteRepository.delete({ regla_id: id });
    await this.productsImagesService.removeSelloAsset(regla.nombre_archivo);
    await this.reglaWriteRepository.delete({ id });

    return { success: true, message: 'Regla de sello eliminada y sello retirado de los productos.' };
  }

  // Aplica/retira el sello de una regla según los productos que matchean su filtro
  // en este momento, sin pisar nunca un sello cargado a mano en un producto puntual
  // (productos_sello.regla_id IS NULL).
  private async syncRegla(regla: SellosRegla): Promise<{ matched: number }> {
    if (!this.isVigente(regla)) {
      await this.selloWriteRepository.delete({ regla_id: regla.id });
      return { matched: 0 };
    }

    const codigos = await this.productsService.getCodigosMatchingFilters({
      categoria: regla.filtro_categoria || undefined,
      marca: regla.filtro_marca || undefined,
      proveedor: regla.filtro_proveedor || undefined,
      precioMin: regla.filtro_precio_min ?? undefined,
      precioMax: regla.filtro_precio_max ?? undefined,
    });

    if (!codigos.length) {
      await this.selloWriteRepository.delete({ regla_id: regla.id });
      return { matched: 0 };
    }

    const values = codigos.map(() => '(?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())').join(', ');
    const params: any[] = [];
    for (const codigo of codigos) {
      params.push(
        codigo,
        regla.url_sello,
        regla.nombre_archivo,
        regla.fecha_desde,
        regla.fecha_hasta,
        regla.id,
        regla.created_by,
      );
    }

    await this.selloWriteRepository.query(
      `INSERT INTO productos_sello
         (producto_codigo, url_sello, nombre_archivo, activo, fecha_desde, fecha_hasta, regla_id, created_by, created_at, updated_at)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE
         url_sello = IF(productos_sello.regla_id IS NULL, productos_sello.url_sello, VALUES(url_sello)),
         nombre_archivo = IF(productos_sello.regla_id IS NULL, productos_sello.nombre_archivo, VALUES(nombre_archivo)),
         fecha_desde = IF(productos_sello.regla_id IS NULL, productos_sello.fecha_desde, VALUES(fecha_desde)),
         fecha_hasta = IF(productos_sello.regla_id IS NULL, productos_sello.fecha_hasta, VALUES(fecha_hasta)),
         regla_id = IF(productos_sello.regla_id IS NULL, productos_sello.regla_id, VALUES(regla_id)),
         activo = 1,
         updated_at = NOW()`,
      params,
    );

    await this.selloWriteRepository.query(
      `DELETE FROM productos_sello
        WHERE regla_id = ?
          AND producto_codigo NOT IN (${codigos.map(() => '?').join(', ')})`,
      [regla.id, ...codigos],
    );

    return { matched: codigos.length };
  }

  // Cada 10 minutos: expira reglas vencidas y resincroniza el resto (agrega sello a
  // productos nuevos que empiezan a matchear, lo retira de los que dejaron de matchear).
  @Cron('*/10 * * * *')
  async syncAllReglas(): Promise<void> {
    const reglas = await this.reglaReadRepository.find();
    if (!reglas.length) return;
    const now = new Date();

    for (const regla of reglas) {
      try {
        if (regla.activo && regla.fecha_hasta && new Date(regla.fecha_hasta) < now) {
          await this.reglaWriteRepository.update({ id: regla.id }, { activo: false });
          regla.activo = false;
        }
        await this.syncRegla(regla);
      } catch (error) {
        this.logger.error(`Error sincronizando regla de sello #${regla.id}: ${(error as Error)?.message}`);
      }
    }
  }
}
