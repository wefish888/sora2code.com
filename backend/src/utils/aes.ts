import crypto from 'crypto';
import { logger } from './logger';

/**
 * AES 加密解密工具类
 * 用于响应数据的对称加密
 */
class AESCrypto {
  private static instance: AESCrypto;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private authTagLength = 16; // 128 bits

  private constructor() {
    logger.info('AES crypto initialized');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AESCrypto {
    if (!AESCrypto.instance) {
      AESCrypto.instance = new AESCrypto();
    }
    return AESCrypto.instance;
  }

  /**
   * 生成随机 AES 密钥
   * @returns Base64 编码的密钥
   */
  public generateKey(): string {
    const key = crypto.randomBytes(this.keyLength);
    return key.toString('base64');
  }

  /**
   * 使用 AES-GCM 加密数据
   * @param data 要加密的数据（字符串或对象）
   * @param keyBase64 Base64 编码的 AES 密钥
   * @returns 包含加密数据、IV 和认证标签的对象
   */
  public encrypt(data: any, keyBase64: string): { encrypted: string; iv: string; authTag: string } {
    try {
      // 将数据转换为字符串
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // 解码密钥
      const key = Buffer.from(keyBase64, 'base64');

      // 生成随机 IV
      const iv = crypto.randomBytes(this.ivLength);

      // 创建加密器
      const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;

      // 加密数据
      let encrypted = cipher.update(dataString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 获取认证标签
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
    } catch (error) {
      logger.error('AES encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 使用 AES-GCM 解密数据
   * @param encrypted Base64 编码的加密数据
   * @param keyBase64 Base64 编码的 AES 密钥
   * @param ivBase64 Base64 编码的 IV
   * @param authTagBase64 Base64 编码的认证标签
   * @returns 解密后的数据字符串
   */
  public decrypt(
    encrypted: string,
    keyBase64: string,
    ivBase64: string,
    authTagBase64: string
  ): string {
    try {
      // 解码参数
      const key = Buffer.from(keyBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // 创建解密器
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      // 解密数据
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('AES decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 验证加密数据格式是否有效
   */
  public isValidEncryptedData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    return !!(data.encrypted && data.iv && data.authTag);
  }
}

// 导出单例实例
export const aesCrypto = AESCrypto.getInstance();