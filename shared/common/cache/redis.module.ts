import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import { CachePersistenteService } from '../services/cache-persistente.service';
import { REDIS_CLIENT } from './redis.constants';

// Re-export para compatibilidad con imports previos `from '.../redis.module'`.
export { REDIS_CLIENT } from './redis.constants';

function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || 'redis';
  const port = process.env.REDIS_PORT || '6379';
  return `redis://${host}:${port}`;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const logger = new Logger('RedisClient');
        const url = resolveRedisUrl();
        const client = new IORedis(url, {
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        client.on('connect', () => logger.log(`Redis conectado: ${url}`));
        client.on('error', (err) =>
          logger.warn(`Redis no disponible (${url}): ${err?.message}`),
        );
        return client;
      },
    },
    CachePersistenteService,
  ],
  exports: [REDIS_CLIENT, CachePersistenteService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}

  onApplicationShutdown(): void {}
}
