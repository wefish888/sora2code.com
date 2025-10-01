import { Hono } from 'hono';
import type { Env } from '../worker';

const cryptoRoutes = new Hono<{ Bindings: Env }>();

// 在 Worker 启动时生成 RSA 密钥对并缓存
let rsaKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;
let publicKeyPem: string | null = null;

/**
 * 生成 RSA 密钥对
 */
async function generateRSAKeyPair() {
  if (rsaKeyPair) return rsaKeyPair;

  rsaKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  ) as { publicKey: CryptoKey; privateKey: CryptoKey };

  return rsaKeyPair;
}

/**
 * 导出公钥为 PEM 格式
 */
async function exportPublicKeyToPem(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  const exportedAsBase64 = bufferToBase64(new Uint8Array(exported));
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

/**
 * Get RSA public key
 * GET /api/v1/crypto/public-key
 *
 * 返回 RSA 公钥用于客户端加密 AES 密钥
 */
cryptoRoutes.get('/public-key', async (c) => {
  try {
    // 生成或获取缓存的密钥对
    const keyPair = await generateRSAKeyPair();

    // 导出公钥
    if (!publicKeyPem) {
      publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);
    }

    return c.json({
      success: true,
      data: {
        publicKey: publicKeyPem,
        algorithm: 'RSA-OAEP',
        hash: 'SHA-256',
        keySize: 2048
      }
    });
  } catch (error) {
    console.error('Failed to get public key:', error);
    return c.json({
      success: false,
      message: 'Failed to retrieve public key'
    }, 500);
  }
});

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

/**
 * Decrypt AES key (RSA-OAEP)
 * POST /api/v1/crypto/decrypt-aes-key
 *
 * 这个端点用于服务端解密客户端用 RSA 加密的 AES 密钥
 * 注意：实际应用中，客户端直接在请求头中发送 AES 密钥即可，
 * 这个端点主要用于调试和验证加密流程
 */
cryptoRoutes.post('/decrypt-aes-key', async (c) => {
  try {
    const body = await c.req.json();
    const { encryptedAesKey } = body;

    if (!encryptedAesKey) {
      return c.json({
        success: false,
        message: 'encryptedAesKey is required'
      }, 400);
    }

    // 确保密钥对存在
    const keyPair = await generateRSAKeyPair();

    // 解密 AES 密钥
    const encryptedBuffer = base64ToBuffer(encryptedAesKey);
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      keyPair.privateKey,
      encryptedBuffer
    );

    const aesKey = bufferToBase64(new Uint8Array(decryptedBuffer));

    return c.json({
      success: true,
      data: {
        aesKey
      }
    });
  } catch (error) {
    console.error('Failed to decrypt AES key:', error);
    return c.json({
      success: false,
      message: 'Failed to decrypt AES key'
    }, 500);
  }
});

/**
 * Generate AES key for client
 * GET /api/v1/crypto/generate-aes-key
 *
 * 生成一个随机的 AES-256 密钥供客户端使用
 */
cryptoRoutes.get('/generate-aes-key', async (c) => {
  try {
    // 生成 32 字节（256 位）随机密钥
    const aesKey = crypto.getRandomValues(new Uint8Array(32));
    const aesKeyBase64 = bufferToBase64(aesKey);

    console.log('[Generate AES Key] Generated key length:', aesKey.length, 'bytes');
    console.log('[Generate AES Key] Base64 length:', aesKeyBase64.length, 'chars');

    return c.json({
      success: true,
      data: {
        aesKey: aesKeyBase64,
        keySize: 256,
        keyBytes: 32,
        algorithm: 'AES-GCM',
        usage: 'Use this key in X-AES-Key header for encrypted requests'
      }
    });
  } catch (error) {
    console.error('Failed to generate AES key:', error);
    return c.json({
      success: false,
      message: 'Failed to generate AES key'
    }, 500);
  }
});

/**
 * Validate AES key
 * POST /api/v1/crypto/validate-aes-key
 *
 * 验证客户端的 AES 密钥是否有效
 */
cryptoRoutes.post('/validate-aes-key', async (c) => {
  try {
    const body = await c.req.json();
    const { aesKey } = body;

    if (!aesKey) {
      return c.json({
        success: false,
        message: 'aesKey is required'
      }, 400);
    }

    console.log('[Validate AES Key] Received key (base64) length:', aesKey.length);
    console.log('[Validate AES Key] Key preview:', aesKey.substring(0, 50) + '...');

    // 尝试解码
    const keyBuffer = base64ToBuffer(aesKey);
    console.log('[Validate AES Key] Decoded key length:', keyBuffer.length, 'bytes');

    // 验证密钥长度
    const validLengths = [16, 24, 32];
    const isValid = validLengths.includes(keyBuffer.length);

    return c.json({
      success: true,
      data: {
        valid: isValid,
        keySize: keyBuffer.length * 8,
        keyBytes: keyBuffer.length,
        expectedBytes: '16 (AES-128), 24 (AES-192), or 32 (AES-256)',
        base64Length: aesKey.length
      }
    });
  } catch (error) {
    console.error('Failed to validate AES key:', error);
    return c.json({
      success: false,
      message: 'Failed to validate AES key',
      error: error instanceof Error ? error.message : String(error)
    }, 400);
  }
});

/**
 * Base64 转 Buffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export { cryptoRoutes };