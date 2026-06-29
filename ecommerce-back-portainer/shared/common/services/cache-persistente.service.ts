import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.constants';

/**
 * Caché distribuida respaldada por Redis.
 *
 * Antes esto era un Map en memoria + un archivo JSON en el disco del pod, lo que
 * impedía escalar horizontalmente (cada réplica tenía su propio caché y su propio
 * archivo → datos divergentes). Ahora todas las réplicas comparten el mismo Redis.
 *
 * La API pública (get/set/del/clear/keys/getStats/cleanup/getWithFallback/preload)
 * se mantiene idéntica para no tocar a los consumidores. Los TTL siguen en
 * milisegundos. Si Redis no está disponible, las operaciones degradan a cache-miss
 * (no lanzan), de modo que la request sigue funcionando aunque sin caché.
 */
@Injectable()
export class CachePersistenteService {
  private readonly logger = new Logger(CachePersistenteService.name);
  // Namespace para aislar las claves de este servicio dentro de Redis.
  private readonly prefix = process.env.CACHE_PREFIX || 'cache';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private k(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.k(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.debug(`get(${key}) cache-miss por error Redis: ${error?.['message']}`);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl = 300000): Promise<void> {
    try {
      // PX = TTL en milisegundos (compatible con la API previa).
      await this.redis.set(this.k(key), JSON.stringify(data), 'PX', ttl);
    } catch (error) {
      this.logger.debug(`set(${key}) ignorado por error Redis: ${error?.['message']}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.k(key));
    } catch (error) {
      this.logger.debug(`del(${key}) ignorado por error Redis: ${error?.['message']}`);
    }
  }

  /** Borra todas las claves bajo un prefijo lógico (ej. 'products:'). Usa SCAN para no bloquear Redis. */
  async delByPrefix(prefix: string): Promise<void> {
    try {
      const match = `${this.k(prefix)}*`;
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch (error) {
      this.logger.debug(`delByPrefix(${prefix}) ignorado por error Redis: ${error?.['message']}`);
    }
  }

  /** Borra todas las claves de este namespace. */
  async clear(): Promise<void> {
    await this.delByPrefix('');
  }

  async keys(): Promise<string[]> {
    try {
      const match = `${this.prefix}:*`;
      const out: string[] = [];
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
        cursor = next;
        out.push(...keys.map((k) => k.slice(this.prefix.length + 1)));
      } while (cursor !== '0');
      return out;
    } catch (error) {
      this.logger.debug(`keys() vacío por error Redis: ${error?.['message']}`);
      return [];
    }
  }

  async getStats(): Promise<{ size: number; keys: string[]; memoryUsage: number }> {
    const keys = await this.keys();
    return { size: keys.length, keys, memoryUsage: 0 };
  }

  /** No-op: Redis expira las claves automáticamente vía TTL. Se mantiene por compatibilidad. */
  async cleanup(): Promise<void> {
    return;
  }

  async getWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl = 300000,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const data = await fallback();
    await this.set(key, data, ttl);
    return data;
  }

  async preload<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl = 300000,
  ): Promise<void> {
    try {
      const data = await dataLoader();
      await this.set(key, data, ttl);
      this.logger.log(`Preloaded cache for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error preloading cache for key ${key}:`, error);
    }
  }
}
