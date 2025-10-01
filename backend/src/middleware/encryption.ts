import { Context, Next } from 'hono';
import type { Env } from '../worker';

/**
 * Hono 加密中间件
 * 使用 Web Crypto API 进行 AES-GCM 加密
 */

// 白名单路由列表 - 不需要加密的路由
const ENCRYPTION_WHITELIST = [
  '/api/v1/crypto/public-key',
  '/api/v1/crypto/generate-aes-key',
  '/api/v1/crypto/validate-aes-key',
  '/api/v1/crypto/decrypt-aes-key',
  '/health',
  '/api/v1/admin'  // 管理接口暂时不加密
];

/**
 * 检查路由是否在白名单中
 */
function isWhitelisted(path: string): boolean {
  return ENCRYPTION_WHITELIST.some(route => path.startsWith(route));
}

/**
 * AES 响应加密中间件（强制加密）
 * 所有响应必须加密，客户端必须提供 AES 密钥
 */
export const encryptionMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  // 跳过白名单路由
  if (isWhitelisted(c.req.path)) {
    return next();
  }

  // 强制检查客户端是否提供了 AES 密钥
  const aesKeyHeader = c.req.header('X-AES-Key');

  if (!aesKeyHeader) {
    return c.json({
      success: false,
      error: 'Encryption Required',
      message: 'X-AES-Key header is required for all API requests'
    }, 400);
  }

  // 保存 AES 密钥到上下文
  c.set('aesKey', aesKeyHeader);

  // 拦截 c.json 方法
  const originalJson = c.json.bind(c);

  // @ts-ignore - 重写 json 方法
  c.json = function(body: any, init?: ResponseInit) {
    // 立即返回一个 Promise，在其中进行加密
    return (async () => {
      try {
        // 使用客户端提供的 AES 密钥加密响应数据
        const encrypted = await encryptData(body, aesKeyHeader);

        // 发送加密的响应
        return originalJson({
          encrypted: true,
          data: encrypted.data,
          iv: encrypted.iv,
          authTag: encrypted.authTag
        }, init);
      } catch (error) {
        console.error('Failed to encrypt response:', error);
        return originalJson({
          success: false,
          error: 'Encryption Failed',
          message: error instanceof Error ? error.message : 'Failed to encrypt response'
        }, { status: 500 });
      }
    })();
  };

  await next();
};

/**
 * AES 响应加密中间件（可选加密）
 * 如果客户端提供了 AES 密钥则加密，否则返回明文
 */
export const optionalEncryptionMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  // 跳过白名单路由
  if (isWhitelisted(c.req.path)) {
    return next();
  }

  // 检查客户端是否提供了 AES 密钥
  const aesKeyHeader = c.req.header('X-AES-Key');

  // 如果没有提供密钥，跳过加密
  if (!aesKeyHeader) {
    return next();
  }

  // 保存 AES 密钥到上下文
  c.set('aesKey', aesKeyHeader);

  // 拦截 c.json 方法
  const originalJson = c.json.bind(c);

  // @ts-ignore - 重写 json 方法
  c.json = function(body: any, init?: ResponseInit) {
    // 立即返回一个 Promise，在其中进行加密
    return (async () => {
      try {
        // 使用客户端提供的 AES 密钥加密响应数据
        const encrypted = await encryptData(body, aesKeyHeader);

        // 发送加密的响应
        return originalJson({
          encrypted: true,
          data: encrypted.data,
          iv: encrypted.iv,
          authTag: encrypted.authTag
        }, init);
      } catch (error) {
        console.error('Failed to encrypt response:', error);
        return originalJson({
          success: false,
          error: 'Encryption Failed',
          message: error instanceof Error ? error.message : 'Failed to encrypt response'
        }, { status: 500 });
      }
    })();
  };

  await next();
};

/**
 * 使用 Web Crypto API 进行 AES-GCM 加密
 */
async function encryptData(data: any, keyBase64: string): Promise<{
  data: string;
  iv: string;
  authTag: string;
}> {
  try {
    console.log('[Encryption] Starting encryption process...');
    console.log('[Encryption] Data type:', typeof data);
    console.log('[Encryption] Key (base64) length:', keyBase64?.length);
    console.log('[Encryption] Key (base64) preview:', keyBase64?.substring(0, 50) + '...');

    // 验证密钥
    if (!keyBase64) {
      throw new Error('AES key is required');
    }

    // 清理 Base64 字符串（去除可能的空白字符）
    const cleanedKey = keyBase64.trim();

    // 将数据转换为字符串
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    console.log('[Encryption] Data string length:', dataString.length);

    const dataBuffer = new TextEncoder().encode(dataString);

    // 解码密钥
    console.log('[Encryption] Decoding base64 key...');
    console.log('[Encryption] Cleaned key length:', cleanedKey.length);
    let keyBuffer: Uint8Array;

    try {
      keyBuffer = base64ToBuffer(cleanedKey);
      console.log('[Encryption] Key buffer length:', keyBuffer.length, 'bytes');
    } catch (error) {
      console.error('[Encryption] Failed to decode AES key from base64:', error);
      throw new Error('Invalid base64 encoded AES key');
    }

    // 验证密钥长度（AES-256 需要 32 字节，AES-192 需要 24 字节，AES-128 需要 16 字节）
    if (keyBuffer.length !== 32 && keyBuffer.length !== 24 && keyBuffer.length !== 16) {
      throw new Error(`Invalid AES key length: ${keyBuffer.length} bytes (expected 16, 24, or 32 bytes)`);
    }

    console.log('[Encryption] Using AES-' + (keyBuffer.length * 8) + ' encryption');

    // 生成随机 IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    console.log('[Encryption] Generated IV, length:', iv.length);

    // 导入密钥
    console.log('[Encryption] Importing crypto key...');
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 加密数据
    console.log('[Encryption] Encrypting data...');
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 bytes auth tag
      },
      cryptoKey,
      dataBuffer
    );

    // GCM 模式会在加密数据末尾附加 authTag
    const encrypted = new Uint8Array(encryptedBuffer);
    console.log('[Encryption] Encrypted buffer length:', encrypted.length);

    const ciphertext = encrypted.slice(0, -16); // 去掉最后 16 字节的 authTag
    const authTag = encrypted.slice(-16); // 最后 16 字节是 authTag

    console.log('[Encryption] Ciphertext length:', ciphertext.length);
    console.log('[Encryption] AuthTag length:', authTag.length);

    const result = {
      data: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
      authTag: bufferToBase64(authTag)
    };

    console.log('[Encryption] Encryption successful');
    return result;
  } catch (error) {
    console.error('[Encryption] Error during encryption:', error);
    console.error('[Encryption] Error stack:', error instanceof Error ? error.stack : 'N/A');
    throw error;
  }
}

/**
 * Base64 转 Buffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('[base64ToBuffer] Failed to decode base64:', error);
    throw new Error('Invalid base64 string: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Buffer 转 Base64
 */
function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}