import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from './errorHandler';
import { logger } from '../utils/logger';

// 内存限流存储
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private points: number;
  private duration: number; // 时间窗口（秒）
  private keyPrefix: string;

  constructor(config: {
    points: number;
    duration: number;
    blockDuration: number;
    keyPrefix: string;
  }) {
    this.points = config.points;
    this.duration = config.duration;
    this.keyPrefix = config.keyPrefix;

    // 每分钟清理过期的条目
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(clientId: string): string {
    return `${this.keyPrefix}:${clientId}`;
  }

  async consume(clientId: string): Promise<void> {
    const key = this.getKey(clientId);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // 新的时间窗口或第一次请求
      this.store.set(key, {
        count: 1,
        resetTime: now + (this.duration * 1000)
      });
      return;
    }

    if (entry.count >= this.points) {
      // 超过限制，抛出错误
      const msBeforeNext = entry.resetTime - now;
      const error = new Error('Rate limit exceeded') as any;
      error.msBeforeNext = msBeforeNext;
      error.remainingPoints = 0;
      throw error;
    }

    // 增加计数
    entry.count++;
    this.store.set(key, entry);
  }

  async get(clientId: string): Promise<{ remainingPoints: number; msBeforeNext: number } | null> {
    const key = this.getKey(clientId);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      return {
        remainingPoints: this.points,
        msBeforeNext: 0
      };
    }

    return {
      remainingPoints: Math.max(0, this.points - entry.count),
      msBeforeNext: entry.resetTime - now
    };
  }

  async delete(clientId: string): Promise<void> {
    const key = this.getKey(clientId);
    this.store.delete(key);
  }
}

// 速率限制配置
const rateLimitConfig = {
  // 一般请求限制
  general: {
    keyPrefix: 'rl_general',
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 允许的请求数
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900') / 1000, // 时间窗口（秒）
    blockDuration: 60, // 阻塞时间（秒）
  },

  // 认证相关请求限制
  auth: {
    keyPrefix: 'rl_auth',
    points: 5, // 5次尝试
    duration: 900, // 15分钟
    blockDuration: 900, // 阻塞15分钟
  },

  // API密集操作限制
  intensive: {
    keyPrefix: 'rl_intensive',
    points: 10, // 10次请求
    duration: 60, // 1分钟
    blockDuration: 60, // 阻塞1分钟
  },

  // 代码复制限制
  codeCopy: {
    keyPrefix: 'rl_copy',
    points: 50, // 50次复制
    duration: 60, // 1分钟
    blockDuration: 30, // 阻塞30秒
  }
};

// 创建速率限制器实例
const generalLimiter = new MemoryRateLimiter(rateLimitConfig.general);
const authLimiter = new MemoryRateLimiter(rateLimitConfig.auth);
const intensiveLimiter = new MemoryRateLimiter(rateLimitConfig.intensive);
const copyLimiter = new MemoryRateLimiter(rateLimitConfig.codeCopy);

// 获取客户端标识
function getClientId(req: Request): string {
  // 优先使用用户ID，其次使用IP地址
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // 获取真实IP地址
  const ip = req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any).socket?.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

// 通用速率限制中间件生成器
function createRateLimitMiddleware(limiter: MemoryRateLimiter, name: string, config: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getClientId(req);

      await limiter.consume(clientId);

      // 获取剩余点数和重置时间
      const resRateLimiter = await limiter.get(clientId);

      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': config.points.toString(),
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
          'X-RateLimit-Reset': (Date.now() + resRateLimiter.msBeforeNext).toString()
        });
      }

      next();
    } catch (rateLimiterRes) {
      const resetTime = Date.now() + (rateLimiterRes as any).msBeforeNext;

      res.set({
        'X-RateLimit-Limit': config.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toString(),
        'Retry-After': Math.round((rateLimiterRes as any).msBeforeNext / 1000).toString()
      });

      logger.warn(`Rate limit exceeded for ${name}:`, {
        clientId: getClientId(req),
        path: req.path,
        method: req.method,
        resetTime: new Date(resetTime)
      });

      throw new TooManyRequestsError(
        `Too many ${name} requests. Try again later.`
      );
    }
  };
}

// 导出不同类型的速率限制中间件
export const rateLimitMiddleware = createRateLimitMiddleware(generalLimiter, 'general', rateLimitConfig.general);
export const authRateLimit = createRateLimitMiddleware(authLimiter, 'auth', rateLimitConfig.auth);
export const intensiveRateLimit = createRateLimitMiddleware(intensiveLimiter, 'intensive', rateLimitConfig.intensive);
export const copyRateLimit = createRateLimitMiddleware(copyLimiter, 'copy', rateLimitConfig.codeCopy);

// 自定义速率限制检查
export async function checkRateLimit(
  req: Request,
  limiterType: 'general' | 'auth' | 'intensive' | 'copy'
): Promise<boolean> {
  try {
    const clientId = getClientId(req);
    let limiter: MemoryRateLimiter;

    switch (limiterType) {
      case 'auth':
        limiter = authLimiter;
        break;
      case 'intensive':
        limiter = intensiveLimiter;
        break;
      case 'copy':
        limiter = copyLimiter;
        break;
      default:
        limiter = generalLimiter;
    }

    await limiter.consume(clientId);
    return true;
  } catch {
    return false;
  }
}

// 重置速率限制
export async function resetRateLimit(
  clientId: string,
  limiterType: 'general' | 'auth' | 'intensive' | 'copy'
): Promise<void> {
  try {
    let limiter: MemoryRateLimiter;

    switch (limiterType) {
      case 'auth':
        limiter = authLimiter;
        break;
      case 'intensive':
        limiter = intensiveLimiter;
        break;
      case 'copy':
        limiter = copyLimiter;
        break;
      default:
        limiter = generalLimiter;
    }

    await limiter.delete(clientId);
    logger.info(`Rate limit reset for ${limiterType}:`, { clientId });
  } catch (error) {
    logger.error('Failed to reset rate limit:', { clientId, limiterType, error });
  }
}