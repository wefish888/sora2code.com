import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { prisma } from '../utils/database';
import { CacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';

// 扩展 Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isVerified: boolean;
        isPremium: boolean;
      };
    }
  }
}

// 用户数据库类型接口
interface UserFromDB {
  id: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  isPremium: boolean;
  premiumExpiresAt: Date | null;
}

// JWT 载荷接口
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// JWT 工具类
export class JWTManager {
  private static accessTokenSecret = process.env.JWT_SECRET as string;
  private static refreshTokenSecret = process.env.JWT_REFRESH_SECRET as string;
  private static accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
  private static refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  // 生成访问令牌
  static generateAccessToken(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string {
    return (jwt.sign as any)(
      { ...payload, type: 'access' },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  // 生成刷新令牌
  static generateRefreshToken(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string {
    return (jwt.sign as any)(
      { ...payload, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
  }

  // 生成令牌对
  static generateTokenPair(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  // 验证访问令牌
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid access token');
    }
  }

  // 验证刷新令牌
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  // 检查令牌是否在黑名单中
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    return await CacheService.exists(key);
  }

  // 将令牌加入黑名单
  static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await CacheService.set(`blacklist:${token}`, '1', ttl);
        }
      }
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }
}

// 认证中间件
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // 检查令牌是否在黑名单中
    const isBlacklisted = await JWTManager.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // 验证令牌
    const payload = JWTManager.verifyAccessToken(token);

    // 从缓存或数据库获取用户信息
    let user: UserFromDB | null = await CacheService.get(CacheKeys.userProfile(payload.userId));

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          isVerified: true,
          isActive: true,
          isPremium: true,
          premiumExpiresAt: true
        }
      }) as UserFromDB | null;

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // 缓存用户信息
      await CacheService.set(CacheKeys.userProfile(payload.userId), user, 1800); // 30分钟
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is disabled');
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      role: payload.role || 'user',
      isVerified: user.isVerified,
      isPremium: user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())
    };

    next();
  } catch (error) {
    next(error);
  }
};

// 可选认证中间件（不强制要求认证）
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await authMiddleware(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    // 可选认证失败时不抛出错误
    next();
  }
};

// 角色权限中间件
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// 管理员权限中间件
export const requireAdmin = requireRole(['admin', 'super_admin']);

// 邮箱验证中间件
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.isVerified) {
    throw new ForbiddenError('Email verification required');
  }

  next();
};

// 高级会员中间件
export const requirePremium = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.isPremium) {
    throw new ForbiddenError('Premium subscription required');
  }

  next();
};