import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.constants';

@Injectable()
export class CachePersistenteService {
  private readonly logger = new Logger(CachePersistenteService.name);
  
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
