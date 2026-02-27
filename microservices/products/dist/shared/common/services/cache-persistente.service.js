"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CachePersistenteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachePersistenteService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let CachePersistenteService = CachePersistenteService_1 = class CachePersistenteService {
    constructor() {
        this.logger = new common_1.Logger(CachePersistenteService_1.name);
        this.cacheDir = (0, path_1.join)(process.cwd(), 'cache');
        this.cacheFile = (0, path_1.join)(this.cacheDir, 'persistent-cache.json');
        this.memoryCache = new Map();
        this.ensureCacheDirectory();
        this.loadPersistedCache();
    }
    ensureCacheDirectory() {
        try {
            if (!(0, fs_1.existsSync)(this.cacheDir)) {
                (0, fs_1.mkdirSync)(this.cacheDir, { recursive: true });
                this.logger.log(`Created cache directory: ${this.cacheDir}`);
            }
        }
        catch (error) {
            this.logger.error('Error creating cache directory:', error);
        }
    }
    loadPersistedCache() {
        try {
            if ((0, fs_1.existsSync)(this.cacheFile)) {
                const data = (0, fs_1.readFileSync)(this.cacheFile, 'utf8');
                const persistedCache = JSON.parse(data);
                const now = Date.now();
                for (const [key, value] of Object.entries(persistedCache)) {
                    const cacheItem = value;
                    if (now - cacheItem.timestamp < cacheItem.ttl) {
                        this.memoryCache.set(key, cacheItem);
                    }
                }
                this.logger.log(`Loaded ${this.memoryCache.size} items from persistent cache`);
            }
        }
        catch (error) {
            this.logger.error('Error loading persisted cache:', error);
        }
    }
    persistCache() {
        try {
            const cacheData = {};
            for (const [key, value] of this.memoryCache.entries()) {
                cacheData[key] = value;
            }
            (0, fs_1.writeFileSync)(this.cacheFile, JSON.stringify(cacheData, null, 2));
            this.logger.debug(`Persisted ${this.memoryCache.size} cache items`);
        }
        catch (error) {
            this.logger.error('Error persisting cache:', error);
        }
    }
    async get(key) {
        try {
            const cached = this.memoryCache.get(key);
            if (cached) {
                const now = Date.now();
                if (now - cached.timestamp < cached.ttl) {
                    return cached.data;
                }
                else {
                    this.memoryCache.delete(key);
                    this.persistCache();
                }
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Error getting cache for key ${key}:`, error);
            return null;
        }
    }
    async set(key, data, ttl = 300000) {
        try {
            const cacheItem = {
                data,
                timestamp: Date.now(),
                ttl,
            };
            this.memoryCache.set(key, cacheItem);
            this.persistCache();
            this.logger.debug(`Cached data for key: ${key}, TTL: ${ttl}ms`);
        }
        catch (error) {
            this.logger.error(`Error setting cache for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            this.memoryCache.delete(key);
            this.persistCache();
            this.logger.debug(`Deleted cache for key: ${key}`);
        }
        catch (error) {
            this.logger.error(`Error deleting cache for key ${key}:`, error);
        }
    }
    async clear() {
        try {
            this.memoryCache.clear();
            this.persistCache();
            this.logger.log('Cleared all cache');
        }
        catch (error) {
            this.logger.error('Error clearing cache:', error);
        }
    }
    async keys() {
        try {
            return Array.from(this.memoryCache.keys());
        }
        catch (error) {
            this.logger.error('Error getting cache keys:', error);
            return [];
        }
    }
    async getStats() {
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
        }
        catch (error) {
            this.logger.error('Error getting cache stats:', error);
            return { size: 0, keys: [], memoryUsage: 0 };
        }
    }
    async cleanup() {
        try {
            const now = Date.now();
            const keysToDelete = [];
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
        }
        catch (error) {
            this.logger.error('Error cleaning up cache:', error);
        }
    }
    async getWithFallback(key, fallback, ttl = 300000) {
        try {
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }
            const data = await fallback();
            await this.set(key, data, ttl);
            return data;
        }
        catch (error) {
            this.logger.error(`Error in getWithFallback for key ${key}:`, error);
            throw error;
        }
    }
    async preload(key, dataLoader, ttl = 300000) {
        try {
            const data = await dataLoader();
            await this.set(key, data, ttl);
            this.logger.log(`Preloaded cache for key: ${key}`);
        }
        catch (error) {
            this.logger.error(`Error preloading cache for key ${key}:`, error);
        }
    }
};
exports.CachePersistenteService = CachePersistenteService;
exports.CachePersistenteService = CachePersistenteService = CachePersistenteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CachePersistenteService);
//# sourceMappingURL=cache-persistente.service.js.map