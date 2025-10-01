import { Request, Response, NextFunction } from 'express';
import { rsaCrypto } from '../utils/rsa';
import { aesCrypto } from '../utils/aes';
import { logger } from '../utils/logger';

// 扩展 Request 类型以包含 AES 密钥
declare global {
  namespace Express {
    interface Request {
      aesKey?: string;
      clientWantsEncryption?: boolean;
    }
  }
}

/**
 * 白名单路由列表 - 不需要加密的路由
 */
const ENCRYPTION_WHITELIST = [
  '/crypto/public-key',  // 公钥获取接口
  '/health',             // 健康检查
  '/codes/'              // 代码相关接口（包括投票、复制等）
];

/**
 * 检查请求方法和路径是否需要加密
 * 投票和复制操作不需要加密
 */
function requiresEncryption(method: string, path: string): boolean {
  // 投票操作不需要加密
  if (path.includes('/vote')) {
    return false;
  }

  // 复制操作不需要加密
  if (path.includes('/copy')) {
    return false;
  }

  return true;
}

/**
 * 检查路由是否在白名单中
 */
function isWhitelisted(path: string): boolean {
  return ENCRYPTION_WHITELIST.some(route => path.startsWith(route));
}

/**
 * RSA 请求解密中间件（强制加密）
 * 拦截加密的请求体，解密后替换原始请求体
 */
export const rsaDecryptMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 白名单路由跳过加密检查
    if (isWhitelisted(req.path)) {
      return next();
    }

    // GET 请求通常没有请求体，跳过加密检查
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    // 检查请求体是否存在
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    // 检查是否需要加密
    if (!requiresEncryption(req.method, req.path)) {
      return next();
    }

    // 强制要求加密数据
    if (!req.body.encrypted || !req.body.data) {
      logger.warn(`Unencrypted request detected: ${req.method} ${req.path}`);
      res.status(400).json({
        success: false,
        message: 'Encryption is required for all API requests'
      });
      return;
    }

    const encryptedData = req.body.data;

    // 验证加密数据格式
    if (!rsaCrypto.isValidEncryptedData(encryptedData)) {
      res.status(400).json({
        success: false,
        message: 'Invalid encrypted data format'
      });
      return;
    }

    // 解密数据
    try {
      const decryptedString = rsaCrypto.decrypt(encryptedData);
      const decryptedData = JSON.parse(decryptedString);

      // 替换请求体为解密后的数据
      req.body = decryptedData;

      logger.info(`✅ Request data decrypted successfully: ${req.method} ${req.path}`);
    } catch (error) {
      logger.error('Failed to decrypt request data:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to decrypt request data'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('RSA decrypt middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during decryption'
    });
  }
};

/**
 * AES 响应加密中间件
 * 使用客户端提供的 AES 密钥来加密响应数据
 */
export const aesEncryptMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 跳过白名单路由
  if (isWhitelisted(req.path)) {
    return next();
  }

  // 检查客户端是否提供了加密的 AES 密钥（在请求头中）
  const encryptedAesKey = req.headers['x-aes-key'] as string;

  if (!encryptedAesKey) {
    // 客户端没有提供 AES 密钥，跳过响应加密
    return next();
  }

  try {
    // 使用 RSA 私钥解密客户端提供的 AES 密钥
    const aesKeyBase64 = rsaCrypto.decrypt(encryptedAesKey);
    req.aesKey = aesKeyBase64;
    req.clientWantsEncryption = true;

    logger.debug(`AES key received and decrypted for ${req.method} ${req.path}`);
  } catch (error) {
    logger.error('Failed to decrypt AES key from client:', error);
    return next();  // 解密失败，跳过响应加密
  }

  // 拦截 res.json 方法
  const originalJson = res.json.bind(res);

  res.json = function(body: any) {
    if (!req.aesKey) {
      return originalJson(body);
    }

    try {
      // 使用客户端提供的 AES 密钥加密响应数据
      const { encrypted, iv, authTag } = aesCrypto.encrypt(body, req.aesKey);

      // 发送加密的响应
      const encryptedResponse = {
        encrypted: true,
        data: encrypted,   // AES 加密的数据
        iv,                // AES IV
        authTag            // AES 认证标签
      };

      logger.info(`✅ Response encrypted with client AES key: ${req.method} ${req.path}`);
      return originalJson(encryptedResponse);
    } catch (error) {
      logger.error('Failed to encrypt response:', error);
      return originalJson({
        success: false,
        message: 'Failed to encrypt response'
      });
    }
  };

  next();
};

/**
 * 组合中间件：同时支持请求解密和响应加密
 */
export const rsaCryptoMiddleware = [rsaDecryptMiddleware, aesEncryptMiddleware];
