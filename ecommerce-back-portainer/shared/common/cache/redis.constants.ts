/**
 * Token de inyección del cliente Redis compartido.
 *
 * Vive en su propio archivo (no en redis.module.ts) para evitar la dependencia
 * circular módulo ↔ servicio: CachePersistenteService importa este token, y
 * RedisModule importa a CachePersistenteService.
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
