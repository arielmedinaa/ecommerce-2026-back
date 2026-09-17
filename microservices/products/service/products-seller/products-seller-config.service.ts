import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsSellerColumnaActiva } from '../../schemas/products-seller/products-seller-columna-activa.schema';
import { StockMinimoConfig } from '../../schemas/products-seller/stock-minimo-config.schema';
import {
  EXTRA_COLUMNAS_OPCIONALES,
  EXTRA_COLUMNAS_KEYS,
  DEFAULT_STOCK_MINIMO_GENERAL,
} from '../../constants/products-seller-extra-columns';

@Injectable()
export class ProductsSellerConfigService {
  constructor(
    @InjectRepository(ProductsSellerColumnaActiva, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly columnaActivaRepository: Repository<ProductsSellerColumnaActiva>,
    @InjectRepository(StockMinimoConfig, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly stockMinimoRepository: Repository<StockMinimoConfig>,
  ) {}

  async getColumnasActivas(idProveedor: number): Promise<string[]> {
    const activas = await this.columnaActivaRepository.find({ where: { id_proveedor: idProveedor } });
    return activas.map((a) => a.columna);
  }

  async getColumnasDisponibles(idProveedor: number) {
    const activas = await this.getColumnasActivas(idProveedor);
    return {
      data: { columnas: EXTRA_COLUMNAS_OPCIONALES, activas },
      message: 'Ok',
      success: true,
    };
  }

  async setColumnasActivas(idProveedor: number, columnas: string[]) {
    const validas = (columnas || []).filter((c) => EXTRA_COLUMNAS_KEYS.includes(c));
    await this.columnaActivaRepository.delete({ id_proveedor: idProveedor });
    if (validas.length > 0) {
      await this.columnaActivaRepository.save(
        validas.map((columna) => this.columnaActivaRepository.create({ id_proveedor: idProveedor, columna })),
      );
    }
    return { data: { activas: validas }, message: 'Columnas actualizadas', success: true };
  }

  async getStockMinimoConfig(idProveedor: number) {
    const reglas = await this.stockMinimoRepository.find({
      where: { id_proveedor: idProveedor },
      order: { created_at: 'DESC' },
    });
    return { data: { defaultGeneral: DEFAULT_STOCK_MINIMO_GENERAL, reglas }, message: 'Ok', success: true };
  }

  async upsertStockMinimoRule(
    idProveedor: number,
    payload: {
      id?: number;
      tipo: 'familia' | 'producto' | 'fecha_carga';
      codigo_familia?: string | null;
      codigo_articulo?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      stock_minimo: number;
      stock_casi_bajo?: number | null;
    },
  ) {
    if (!['familia', 'producto', 'fecha_carga'].includes(payload.tipo)) {
      throw new BadRequestException('Tipo de regla inválido');
    }
    if (payload.tipo === 'familia' && !payload.codigo_familia) {
      throw new BadRequestException('Falta la familia para esta regla');
    }
    if (payload.tipo === 'producto' && !payload.codigo_articulo) {
      throw new BadRequestException('Falta el código de producto para esta regla');
    }
    if (payload.tipo === 'fecha_carga' && (!payload.fecha_desde || !payload.fecha_hasta)) {
      throw new BadRequestException('Faltan las fechas para esta regla');
    }
    if (!Number.isFinite(payload.stock_minimo) || payload.stock_minimo < 0) {
      throw new BadRequestException('Stock mínimo inválido');
    }

    const data = {
      id_proveedor: idProveedor,
      tipo: payload.tipo,
      codigo_familia: payload.tipo === 'familia' ? payload.codigo_familia : null,
      codigo_articulo: payload.tipo === 'producto' ? payload.codigo_articulo : null,
      fecha_desde: payload.tipo === 'fecha_carga' ? payload.fecha_desde : null,
      fecha_hasta: payload.tipo === 'fecha_carga' ? payload.fecha_hasta : null,
      stock_minimo: payload.stock_minimo,
      stock_casi_bajo: payload.stock_casi_bajo ?? null,
    };

    if (payload.id) {
      const existente = await this.stockMinimoRepository.findOne({
        where: { id: payload.id, id_proveedor: idProveedor },
      });
      if (!existente) throw new BadRequestException('Regla no encontrada');
      await this.stockMinimoRepository.update(payload.id, data);
      const actualizada = await this.stockMinimoRepository.findOne({ where: { id: payload.id } });
      return { data: actualizada, message: 'Regla actualizada', success: true };
    }

    const creada = await this.stockMinimoRepository.save(this.stockMinimoRepository.create(data));
    return { data: creada, message: 'Regla creada', success: true };
  }

  async deleteStockMinimoRule(idProveedor: number, id: number) {
    const existente = await this.stockMinimoRepository.findOne({ where: { id, id_proveedor: idProveedor } });
    if (!existente) throw new BadRequestException('Regla no encontrada');
    await this.stockMinimoRepository.delete(id);
    return { data: null, message: 'Regla eliminada', success: true };
  }
}
