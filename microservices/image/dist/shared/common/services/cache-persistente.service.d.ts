export declare class CachePersistenteService {
    private readonly logger;
    private readonly cacheDir;
    private readonly cacheFile;
    private memoryCache;
    constructor();
    private ensureCacheDirectory;
    private loadPersistedCache;
    private persistCache;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    getStats(): Promise<{
        size: number;
        keys: string[];
        memoryUsage: number;
    }>;
    cleanup(): Promise<void>;
    getWithFallback<T>(key: string, fallback: () => Promise<T>, ttl?: number): Promise<T>;
    preload<T>(key: string, dataLoader: () => Promise<T>, ttl?: number): Promise<void>;
}
