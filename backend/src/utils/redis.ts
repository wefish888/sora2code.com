import { logger } from './logger';

// 内存缓存项接口
interface CacheItem {
  value: any;
  expiry?: number;
}

// 内存缓存类
class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private timers = new Map<string, NodeJS.Timeout>();

  // 设置缓存项
  set(key: string, value: any, ttl?: number): void {
    // 清除现有的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    let expiry: number | undefined;
    if (ttl && ttl > 0) {
      expiry = Date.now() + (ttl * 1000);
      // 设置过期定时器
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      this.timers.set(key, timer);
    }

    this.cache.set(key, { value, expiry });
  }

  // 获取缓存项
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
        this.timers.delete(key);
      }
      return null;
    }

    return item.value;
  }

  // 删除缓存项
  delete(key: string): void {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  // 检查键是否存在
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // 检查是否过期
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
        this.timers.delete(key);
      }
      return false;
    }

    return true;
  }

  // 设置过期时间
  expire(key: string, ttl: number): void {
    const item = this.cache.get(key);
    if (!item) return;

    // 清除现有定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    if (ttl > 0) {
      const expiry = Date.now() + (ttl * 1000);
      item.expiry = expiry;

      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      this.timers.set(key, timer);
    }
  }

  // 获取剩余过期时间（秒）
  ttl(key: string): number {
    const item = this.cache.get(key);
    if (!item || !item.expiry) return -1;

    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // 原子性增加
  incr(key: string): number {
    const current = this.get(key) || 0;
    const newValue = (typeof current === 'number' ? current : 0) + 1;

    // 保持原有的过期时间
    const item = this.cache.get(key);
    const ttl = item?.expiry ? Math.ceil((item.expiry - Date.now()) / 1000) : undefined;

    this.set(key, newValue, ttl);
    return newValue;
  }

  // 获取匹配模式的所有键
  keys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  // 清除所有缓存
  clear(): void {
    // 清除所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  // 获取缓存统计信息
  stats() {
    return {
      size: this.cache.size,
      timers: this.timers.size
    };
  }
}

// 创建全局内存缓存实例
const memoryCache = new MemoryCache();

// 连接函数（内存缓存不需要连接）
export async function connectRedis(): Promise<void> {
  try {
    logger.info('Memory cache initialized (Redis disabled)');
  } catch (error) {
    logger.error('Failed to initialize memory cache:', error);
    throw error;
  }
}

// 断开连接函数
export async function disconnectRedis(): Promise<void> {
  try {
    memoryCache.clear();
    logger.info('Memory cache cleared');
  } catch (error) {
    logger.error('Error clearing memory cache:', error);
    throw error;
  }
}

// 健康检查
export async function checkRedisHealth(): Promise<boolean> {
  try {
    return true; // 内存缓存总是健康的
  } catch (error) {
    logger.error('Memory cache health check failed:', error);
    return false;
  }
}

// 缓存工具类
export class CacheService {
  // 设置缓存
  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      memoryCache.set(key, value, ttl);
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
      throw error;
    }
  }

  // 获取缓存
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = memoryCache.get(key);
      return value as T | null;
    } catch (error) {
      logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  // 删除缓存
  static async del(key: string): Promise<void> {
    try {
      memoryCache.delete(key);
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}:`, error);
      throw error;
    }
  }

  // 模式删除
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = memoryCache.keys(pattern);
      for (const key of keys) {
        memoryCache.delete(key);
      }
    } catch (error) {
      logger.error(`Failed to delete cache pattern ${pattern}:`, error);
      throw error;
    }
  }

  // 检查键是否存在
  static async exists(key: string): Promise<boolean> {
    try {
      return memoryCache.has(key);
    } catch (error) {
      logger.error(`Failed to check existence for key ${key}:`, error);
      return false;
    }
  }

  // 设置过期时间
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      memoryCache.expire(key, ttl);
    } catch (error) {
      logger.error(`Failed to set expiration for key ${key}:`, error);
      throw error;
    }
  }

  // 获取剩余过期时间
  static async ttl(key: string): Promise<number> {
    try {
      return memoryCache.ttl(key);
    } catch (error) {
      logger.error(`Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  // 原子性增加
  static async incr(key: string): Promise<number> {
    try {
      return memoryCache.incr(key);
    } catch (error) {
      logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  // 原子性增加并设置过期时间
  static async incrWithExpire(key: string, ttl: number): Promise<number> {
    try {
      const result = memoryCache.incr(key);
      memoryCache.expire(key, ttl);
      return result;
    } catch (error) {
      logger.error(`Failed to increment with expire for key ${key}:`, error);
      throw error;
    }
  }

  // 获取缓存统计信息
  static getStats() {
    return memoryCache.stats();
  }
}

// 缓存键生成器
export class CacheKeys {
  static readonly PREFIX = 'sora2code';

  static codes(filters?: Record<string, any>): string {
    if (filters) {
      const filterStr = Object.keys(filters)
        .sort()
        .map(key => `${key}:${filters[key]}`)
        .join('|');
      return `${this.PREFIX}:codes:${Buffer.from(filterStr).toString('base64')}`;
    }
    return `${this.PREFIX}:codes:all`;
  }

  static code(id: string): string {
    return `${this.PREFIX}:code:${id}`;
  }

  static userProfile(userId: string): string {
    return `${this.PREFIX}:user:${userId}`;
  }

  static codeStats(codeId: string): string {
    return `${this.PREFIX}:stats:code:${codeId}`;
  }

  static rateLimitUser(userId: string): string {
    return `${this.PREFIX}:ratelimit:user:${userId}`;
  }

  static rateLimitIP(ip: string): string {
    return `${this.PREFIX}:ratelimit:ip:${ip}`;
  }

  static session(sessionId: string): string {
    return `${this.PREFIX}:session:${sessionId}`;
  }

  static redditProcessed(postId: string): string {
    return `${this.PREFIX}:reddit:processed:${postId}`;
  }

  static twitterProcessed(tweetId: string): string {
    return `${this.PREFIX}:twitter:processed:${tweetId}`;
  }
}

// 兼容性导出
export const redis = {
  ping: async () => 'PONG',
  connect: connectRedis,
  disconnect: disconnectRedis,
  quit: disconnectRedis,
  get: (key: string) => memoryCache.get(key),
  set: (key: string, value: any) => memoryCache.set(key, value),
  setex: (key: string, ttl: number, value: any) => memoryCache.set(key, value, ttl),
  del: (key: string) => memoryCache.delete(key),
  exists: (key: string) => memoryCache.has(key) ? 1 : 0,
  expire: (key: string, ttl: number) => memoryCache.expire(key, ttl),
  ttl: (key: string) => memoryCache.ttl(key),
  incr: (key: string) => memoryCache.incr(key),
  keys: (pattern: string) => memoryCache.keys(pattern),
  info: async (section?: string) => 'used_memory_human:0M\r\nkeyspace_hits:0\r\nkeyspace_misses:0',
  dbsize: async () => memoryCache.stats().size,
  multi: () => ({
    incr: () => {},
    expire: () => {},
    exec: async () => [[null, memoryCache.incr('temp')]]
  })
};

export default redis;