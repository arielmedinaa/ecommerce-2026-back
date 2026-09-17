import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@products/schemas/products/product.schema';

/**
 * Claves de orden del catálogo, iguales para el ERP y para el panel de
 * proveedores.
 *
 * El procedimiento del ERP (proc_obtener_articulos_ecommerce_web) las calcula
 * en SQL y desde 2026-09-17 las expone como orden_proveedor_tier /
 * score_proveedor / orden_ticket. Los productos del panel viven en worker-RDS,
 * otra base, así que no hay JOIN posible contra cs_score_proveedor ni
 * cs_pautas_meta_ticket_rangos: este util lee esas dos tablas del ERP, las
 * cachea y calcula las mismas tres claves en memoria.
 */

export type ClavesDeOrden = {
  orden_proveedor_tier: number;
  score_proveedor: number | null;
  orden_ticket: number;
};

type RangoTicket = { tier: number; desde: number; hasta: number | null };
type ScoreProveedor = { tier: number; score: number | null };

const TTL_MS = 5 * 60 * 1000;
const TICKET_DESCONOCIDO = 3;
const SIN_SCORE_TIER = 1;

// Mismas clasificaciones que privilegia el ORDER BY del proc: un proveedor sin
// clasificación, o clasificado fuera de estas dos, no entra al tramo con score.
const CLASIFICACIONES_PRIORITARIAS = new Set(['Estratégico', 'Confiable']);

@Injectable()
export class CatalogOrderUtil {
  private readonly logger = new Logger(CatalogOrderUtil.name);

  private rangos: RangoTicket[] | null = null;
  private rangosAt = 0;
  private scores: Map<number, ScoreProveedor> | null = null;
  private scoresAt = 0;

  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
  ) {}

  private async cargarRangos(): Promise<RangoTicket[]> {
    if (this.rangos && Date.now() - this.rangosAt < TTL_MS) return this.rangos;
    try {
      const rows = await this.erpReadRepository.query(
        `SELECT nombre_ticket, monto_desde, monto_hasta
           FROM cs_pautas_meta_ticket_rangos
          WHERE activo = 1
          ORDER BY monto_desde DESC`,
      );
      this.rangos = (rows as any[]).map((r) => ({
        tier:
          r.nombre_ticket === 'Ticket Bajo'
            ? 0
            : r.nombre_ticket === 'Ticket Medio'
              ? 1
              : r.nombre_ticket === 'Ticket Alto'
                ? 2
                : TICKET_DESCONOCIDO,
        desde: Number(r.monto_desde),
        hasta: r.monto_hasta == null ? null : Number(r.monto_hasta),
      }));
      this.rangosAt = Date.now();
    } catch (e) {
      this.logger.warn(
        `No se pudieron leer los rangos de ticket: ${(e as any)?.message ?? e}`,
      );
      this.rangos = this.rangos ?? [];
    }
    return this.rangos;
  }

  private async cargarScores(): Promise<Map<number, ScoreProveedor>> {
    if (this.scores && Date.now() - this.scoresAt < TTL_MS) return this.scores;
    try {
      const rows = await this.erpReadRepository.query(
        `SELECT proveedor, clasificacion, score FROM cs_score_proveedor`,
      );
      const map = new Map<number, ScoreProveedor>();
      for (const r of rows as any[]) {
        const codigo = Number(r.proveedor);
        if (!Number.isFinite(codigo)) continue;
        const prioritario = CLASIFICACIONES_PRIORITARIAS.has(
          String(r.clasificacion ?? '').trim(),
        );
        const candidato: ScoreProveedor = {
          tier: prioritario ? 0 : SIN_SCORE_TIER,
          score: prioritario ? Number(r.score) : null,
        };
        // cs_score_proveedor puede traer más de una fila por proveedor; el proc
        // se queda con la mejor (prioritaria y de mayor score) y acá igual.
        const previo = map.get(codigo);
        if (
          !previo ||
          candidato.tier < previo.tier ||
          (candidato.tier === previo.tier &&
            (candidato.score ?? -1) > (previo.score ?? -1))
        ) {
          map.set(codigo, candidato);
        }
      }
      this.scores = map;
      this.scoresAt = Date.now();
    } catch (e) {
      this.logger.warn(
        `No se pudo leer cs_score_proveedor: ${(e as any)?.message ?? e}`,
      );
      this.scores = this.scores ?? new Map();
    }
    return this.scores;
  }

  private tierTicket(precio: number, rangos: RangoTicket[]): number {
    // rangos viene ordenado por monto_desde DESC, igual que el LIMIT 1 del proc.
    for (const r of rangos) {
      if (precio >= r.desde && (r.hasta == null || precio <= r.hasta)) {
        return r.tier;
      }
    }
    return TICKET_DESCONOCIDO;
  }

  /**
   * Calcula las claves de orden de una lista de productos del panel.
   * `codigoErpProveedor` es proveedores.codigo_erp; si viene null el producto
   * queda sin score, que es el mismo lugar que ocupa un artículo del ERP cuyo
   * proveedor no está clasificado.
   */
  async clavesPara(
    items: Array<{ precio: number; codigoErpProveedor: number | null }>,
  ): Promise<ClavesDeOrden[]> {
    if (items.length === 0) return [];
    const [rangos, scores] = await Promise.all([
      this.cargarRangos(),
      this.cargarScores(),
    ]);
    return items.map((item) => {
      const sp =
        item.codigoErpProveedor != null
          ? scores.get(item.codigoErpProveedor)
          : undefined;
      return {
        orden_proveedor_tier: sp ? sp.tier : SIN_SCORE_TIER,
        score_proveedor: sp ? sp.score : null,
        orden_ticket: this.tierTicket(item.precio, rangos),
      };
    });
  }

  /**
   * Comparador único del catálogo: tramo de proveedor, después score (mayor
   * primero) y recién dentro del score el ticket más bajo primero. Mismo orden
   * que el ORDER BY del proc, para que mezclar las dos fuentes no cambie nada.
   */
  static comparar(a: ClavesDeOrden, b: ClavesDeOrden): number {
    if (a.orden_proveedor_tier !== b.orden_proveedor_tier) {
      return a.orden_proveedor_tier - b.orden_proveedor_tier;
    }
    const sa = a.score_proveedor ?? -1;
    const sb = b.score_proveedor ?? -1;
    if (sa !== sb) return sb - sa;
    return a.orden_ticket - b.orden_ticket;
  }
}
