import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../schemas/products/product.schemas';
import { CircuitBreaker } from '@shared/common/decorators/circuit-breaker.decorator';

export interface PromoCuota {
  cuota: number;
  precio: number;
  precioOriginal: number | null;
}

export interface PromoPriceInfo {
  idPromo: number;
  contado: number | null;
  original: number | null;
  cuotas: PromoCuota[];
  disponibleEcommerce: number | null;
}

@Injectable()
export class PromoPricingUtil {
  private readonly logger = new Logger(PromoPricingUtil.name);
  private promoMapCache: Map<string, PromoPriceInfo> | null = null;
  private promoMapCacheTimestamp = 0;
  private readonly PROMO_CACHE_TTL = 5 * 60 * 1000;
  private readonly breaker = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 20000,
  });

  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
  ) {}

  async getActivePromoPriceMap(): Promise<Map<string, PromoPriceInfo>> {
    const now = Date.now();
    if (
      this.promoMapCache &&
      now - this.promoMapCacheTimestamp < this.PROMO_CACHE_TTL
    ) {
      return this.promoMapCache;
    }

    return this.breaker.execute(
      () => this.fetchActivePromoPriceMap(now),
      async () => {
        if (this.promoMapCache) {
          this.logger.warn(
            'ECONT no disponible: sirviendo precios de promo desde cache en memoria (posiblemente vencida)',
          );
          return this.promoMapCache;
        }
        this.logger.warn(
          'ECONT no disponible y sin cache previa: se continúa sin precios de promo',
        );
        return new Map<string, PromoPriceInfo>();
      },
    );
  }

  private async fetchActivePromoPriceMap(
    now: number,
  ): Promise<Map<string, PromoPriceInfo>> {
    const rows = await this.productReadRepository.query(
      `SELECT d.codigo_identificador AS codigo_articulo,
              d.cantidad_cuotas,
              d.precio_venta,
              d.precio_original,
              d.disponible_ecommerce,
              d.id_promo,
              d.aplica_precio_diferenciado,
              d.modo_precio_diferenciado,
              d.precio_venta_ecommerce
         FROM tbl_promos_detalles d
         JOIN tbl_promos_cabeceras c ON c.id_promo = d.id_promo
        WHERE c.estado = 1
          AND c.canal IN ('ambos', 'ecommerce')
          AND CURDATE() BETWEEN c.fecha_inicio AND c.fecha_fin
          AND d.tipo_codigo = 1
          AND d.estado = 1
        ORDER BY d.codigo_identificador, d.id_promo DESC, d.cantidad_cuotas`,
    );

    const map = new Map<string, PromoPriceInfo>();
    for (const row of rows as any[]) {
      const codigo = String(row.codigo_articulo).trim();
      const cuota = Number(row.cantidad_cuotas);
      const usaPrecioEcommerce =
        Number(row.aplica_precio_diferenciado) === 1 &&
        (row.modo_precio_diferenciado === 'ECOMMERCE' || row.modo_precio_diferenciado === 'AMBOS') &&
        row.precio_venta_ecommerce !== null &&
        row.precio_venta_ecommerce !== undefined;
      const precio = usaPrecioEcommerce
        ? Number(row.precio_venta_ecommerce)
        : Number(row.precio_venta);
      const precioOriginal =
        row.precio_original === null || row.precio_original === undefined
          ? null
          : Number(row.precio_original);
      const disponible =
        row.disponible_ecommerce === null || row.disponible_ecommerce === undefined
          ? null
          : Number(row.disponible_ecommerce);

      let entry = map.get(codigo);
      if (!entry) {
        entry = {
          idPromo: Number(row.id_promo),
          contado: null,
          original: null,
          cuotas: [],
          disponibleEcommerce: disponible,
        };
        map.set(codigo, entry);
      } else if (Number(row.id_promo) !== entry.idPromo) {
        // Un mismo producto puede estar enrolado en más de una promo activa
        // simultánea. Ya se resolvió qué promo "gana" para este producto (la
        // primera fila vista, según el ORDER BY de arriba) — descartamos las
        // filas de otras promos para no mezclar contado/cuotas de promos
        // distintas en el mismo `entry` (eso duplicaba números de `cuota`
        // con precios de promos diferentes).
        continue;
      }

      if (cuota === 0) {
        if (entry.contado === null || precio < entry.contado) {
          entry.contado = precio;
          entry.original = precioOriginal;
        }
      } else {
        entry.cuotas.push({ cuota, precio, precioOriginal });
      }

      if (
        disponible !== null &&
        (entry.disponibleEcommerce === null || disponible < entry.disponibleEcommerce)
      ) {
        entry.disponibleEcommerce = disponible;
      }
    }

    this.promoMapCache = map;
    this.promoMapCacheTimestamp = now;
    this.logger.log(`Promo price map cargado: ${map.size} productos en promo activa`);
    return map;
  }

  async getPromoInfoForCodigos(
    codigos: (string | number)[],
  ): Promise<Map<string, PromoPriceInfo>> {
    const fullMap = await this.getActivePromoPriceMap();
    const filtered = new Map<string, PromoPriceInfo>();
    for (const codigo of codigos) {
      const key = String(codigo).trim();
      const entry = fullMap.get(key);
      if (entry) filtered.set(key, entry);
    }
    return filtered;
  }

  invalidateCache(): void {
    this.promoMapCache = null;
    this.promoMapCacheTimestamp = 0;
  }
}
