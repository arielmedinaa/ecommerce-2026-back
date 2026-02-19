import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CachePersistenteService {
  private readonly logger = new Logger(CachePersistenteService.name);
  private readonly cacheDir = join(process.cwd(), 'cache');
  private readonly cacheFile = join(this.cacheDir, 'persistent-cache.json');
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    this.ensureCacheDirectory();
    this.loadPersistedCache();
  }

  private ensureCacheDirectory() {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
        this.logger.log(`Created cache directory: ${this.cacheDir}`);
      }
    } catch (error) {
      this.logger.error('Error creating cache directory:', error);
    }
  }

  private loadPersistedCache() {
    try {
      if (existsSync(this.cacheFile)) {
        const data = readFileSync(this.cacheFile, 'utf8');
        const persistedCache = JSON.parse(data);
        const now = Date.now();
        for (const [key, value] of Object.entries(persistedCache)) {
          const cacheItem = value as any;
          if (now - cacheItem.timestamp < cacheItem.ttl) {
            this.memoryCache.set(key, cacheItem);
          }
        }
        
        this.logger.log(`Loaded ${this.memoryCache.size} items from persistent cache`);
      }
    } catch (error) {
      this.logger.error('Error loading persisted cache:', error);
    }
  }

  private persistCache() {
    try {
      const cacheData: Record<string, any> = {};
      for (const [key, value] of this.memoryCache.entries()) {
        cacheData[key] = value;
      }
      
      writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      this.logger.debug(`Persisted ${this.memoryCache.size} cache items`);
    } catch (error) {
      this.logger.error('Error persisting cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = this.memoryCache.get(key);
      if (cached) {
        const now = Date.now();
        if (now - cached.timestamp < cached.ttl) {
          return cached.data as T;
        } else {
          this.memoryCache.delete(key);
          this.persistCache();
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number = 300000): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      this.memoryCache.set(key, cacheItem);
      this.persistCache();
      
      this.logger.debug(`Cached data for key: ${key}, TTL: ${ttl}ms`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      this.persistCache();
      this.logger.debug(`Deleted cache for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.persistCache();
      this.logger.log('Cleared all cache');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Array.from(this.memoryCache.keys());
    } catch (error) {
      this.logger.error('Error getting cache keys:', error);
      return [];
    }
  }

  async getStats(): Promise<{
    size: number;
    keys: string[];
    memoryUsage: number;
  }> {
    try {
      const keys = Array.from(this.memoryCache.keys());
      let memoryUsage = 0;
      
      for (const [key, value] of this.memoryCache.entries()) {
        memoryUsage += key.length * 2;
        memoryUsage += JSON.stringify(value).length * 2;
      }
      
      return {
        size: this.memoryCache.size,
        keys,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { size: 0, keys: [], memoryUsage: 0 };
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      for (const [key, value] of this.memoryCache.entries()) {
        if (now - value.timestamp >= value.ttl) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.memoryCache.delete(key);
      }
      
      if (keysToDelete.length > 0) {
        this.persistCache();
        this.logger.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up cache:', error);
    }
  }

  async getWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl: number = 300000,
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
      
      const data = await fallback();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      this.logger.error(`Error in getWithFallback for key ${key}:`, error);
      throw error;
    }
  }

  async preload<T>(key: string, dataLoader: () => Promise<T>, ttl: number = 300000): Promise<void> {
    try {
      const data = await dataLoader();
      await this.set(key, data, ttl);
      this.logger.log(`Preloaded cache for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error preloading cache for key ${key}:`, error);
    }
  }
}
