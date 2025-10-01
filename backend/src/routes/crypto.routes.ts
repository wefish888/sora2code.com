import { Router, Request, Response } from 'express';
import { rsaCrypto } from '../utils/rsa';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取 RSA 公钥
 * GET /api/v1/crypto/public-key
 */
router.get('/public-key', (_req: Request, res: Response) => {
  try {
    const publicKey = rsaCrypto.getPublicKeyPEM();

    res.json({
      success: true,
      data: {
        publicKey,
        keyFormat: 'PEM',
        algorithm: 'RSA',
        keySize: 2048
      }
    });
  } catch (error) {
    logger.error('Failed to get public key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public key'
    });
  }
});

/**
 * 测试加密功能
 * POST /api/v1/crypto/test-encrypt
 * 用于开发环境测试加密/解密功能
 */
router.post('/test-encrypt', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: 'Test endpoint not available in production'
    });
    return;
  }

  try {
    const { data } = req.body;

    if (!data) {
      res.status(400).json({
        success: false,
        message: 'Data is required'
      });
      return;
    }

    // 加密数据
    const encrypted = rsaCrypto.encrypt(JSON.stringify(data));

    res.json({
      success: true,
      data: {
        original: data,
        encrypted
      }
    });
  } catch (error) {
    logger.error('Test encryption failed:', error);
    res.status(500).json({
      success: false,
      message: 'Encryption test failed'
    });
  }
});

/**
 * 测试解密功能
 * POST /api/v1/crypto/test-decrypt
 * 用于开发环境测试解密功能
 */
router.post('/test-decrypt', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: 'Test endpoint not available in production'
    });
    return;
  }

  try {
    const { encrypted } = req.body;

    if (!encrypted) {
      res.status(400).json({
        success: false,
        message: 'Encrypted data is required'
      });
      return;
    }

    // 解密数据
    const decrypted = rsaCrypto.decrypt(encrypted);
    const data = JSON.parse(decrypted);

    res.json({
      success: true,
      data: {
        encrypted,
        decrypted: data
      }
    });
  } catch (error) {
    logger.error('Test decryption failed:', error);
    res.status(500).json({
      success: false,
      message: 'Decryption test failed'
    });
  }
});

export { router as cryptoRouter };