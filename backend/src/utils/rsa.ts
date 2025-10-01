import crypto from 'crypto';
import { logger } from './logger';

/**
 * RSA 加密解密工具类
 * 用于前后端数据传输的加密保护
 */
class RSACrypto {
  private static instance: RSACrypto;
  private publicKey: string = '';
  private privateKey: string = '';

  private constructor() {
    // 生成 2048 位密钥对
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;

    logger.info('RSA key pair generated successfully');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): RSACrypto {
    if (!RSACrypto.instance) {
      RSACrypto.instance = new RSACrypto();
    }
    return RSACrypto.instance;
  }

  /**
   * 获取公钥（Base64 格式）
   */
  public getPublicKey(): string {
    return Buffer.from(this.publicKey).toString('base64');
  }

  /**
   * 获取原始公钥（PEM 格式）
   */
  public getPublicKeyPEM(): string {
    return this.publicKey;
  }

  /**
   * 使用私钥解密数据
   * @param encryptedData Base64 编码的加密数据
   * @returns 解密后的原始字符串
   */
  public decrypt(encryptedData: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('RSA decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 使用公钥加密数据（用于测试）
   * @param data 要加密的数据
   * @returns Base64 编码的加密数据
   */
  public encrypt(data: string): string {
    try {
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        buffer
      );
      return encrypted.toString('base64');
    } catch (error) {
      logger.error('RSA encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 验证加密数据是否有效
   * @param encryptedData Base64 编码的加密数据
   * @returns 是否有效
   */
  public isValidEncryptedData(encryptedData: string): boolean {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return false;
      }
      // 尝试 Base64 解码
      Buffer.from(encryptedData, 'base64');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 重新生成密钥对（用于密钥轮换）
   */
  public regenerateKeys(): void {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;
    logger.info('RSA keys regenerated successfully');
  }
}

// 导出单例实例
export const rsaCrypto = RSACrypto.getInstance();