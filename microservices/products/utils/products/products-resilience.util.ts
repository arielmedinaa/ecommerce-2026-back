import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CircuitBreaker } from '@shared/common/decorators/circuit-breaker.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { Product } from '../../schemas/products/product.schemas';

@Injectable()
export class ProductsResilienceUtil {
  private readonly logger = new Logger(ProductsResilienceUtil.name);
  private readonly dbBreakers = new Map<string, CircuitBreaker>();
  private readonly STALE_TTL = 24 * 60 * 60 * 1000;
  private readonly MAX_RPC_RESPONSE_BYTES = 900 * 1024;
  private stockDepositoIdsCache: { ids: number[]; expiresAt: number } | null = null;
  private readonly STOCK_DEPOSITO_IDS_TTL = 60 * 60 * 1000;

  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
    private readonly cache: CachePersistenteService,
  ) {}

  async getStockDepositoIds(): Promise<number[]> {
    const now = Date.now();
    if (this.stockDepositoIdsCache && this.stockDepositoIdsCache.expiresAt > now) {
      return this.stockDepositoIdsCache.ids;
    }
    const rows = await this.productReadRepository.query(
      `SELECT codigo FROM deposito
        WHERE habilitado_reserva = 1 AND codigo NOT IN (19,20,26,27,28,33) AND codigo_proveedor = 0`,
    );
    const ids = (rows || [])
      .map((r: any) => Number(r.codigo))
      .filter((n: number) => Number.isInteger(n));
    this.stockDepositoIdsCache = { ids, expiresAt: now + this.STOCK_DEPOSITO_IDS_TTL };
    return ids;
  }

  stockJoinSql(depositoIds: number[]): string {
    const list = depositoIds.length ? depositoIds.join(',') : '-1';
    return `JOIN (SELECT DISTINCT codigo_articulo FROM tbl_stock_actual WHERE deposito IN (${list}) AND cantidad_actual > 0) stk ON stk.codigo_articulo = a.codigo_articulo`;
  }

  private getDbBreaker(key: string): CircuitBreaker {
    if (!this.dbBreakers.has(key)) {
      this.dbBreakers.set(
        key,
        new CircuitBreaker({ failureThreshold: 2, resetTimeout: 20000 }),
      );
    }
    return this.dbBreakers.get(key)!;
  }

  withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout de ${ms}ms esperando al ERP (${label})`)),
        ms,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  async withDbResilience<T>(
    breakerKey: string,
    staleCacheKey: string,
    run: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    const breaker = this.getDbBreaker(breakerKey);
    return breaker.execute(
      async () => {
        const result = timeoutMs
          ? await this.withTimeout(run(), timeoutMs, breakerKey)
          : await run();
        await this.cache.set(staleCacheKey, result, this.STALE_TTL);
        return result;
      },
      async () => {
        const stale = await this.cache.get<T>(staleCacheKey);
        if (stale) {
          this.logger.warn(
            `Conexión caída (${breakerKey}): sirviendo respuesta desde stale-cache`,
          );
          return stale;
        }
        throw new Error(
          `Servicio de productos no disponible: conexión caída y sin cache de respaldo (${breakerKey})`,
        );
      },
    );
  }

  assertResponseWithinNatsLimit(payload: unknown, context: string): void {
    const size = Buffer.byteLength(JSON.stringify(payload) ?? '');
    if (size > this.MAX_RPC_RESPONSE_BYTES) {
      this.logger.error(
        `Respuesta de ${context} excede el límite seguro de NATS (${size} bytes > ${this.MAX_RPC_RESPONSE_BYTES}) — se corta antes de responder para no crashear el proceso.`,
      );
      throw new Error(
        `La respuesta de ${context} es demasiado grande. Reducí la cantidad de productos/códigos solicitados.`,
      );
    }
  }
}
