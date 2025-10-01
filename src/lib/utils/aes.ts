/**
 * AES 加密解密工具类（使用 Web Crypto API）
 * 用于解密服务器响应数据
 */

/**
 * Base64 转 ArrayBuffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * ArrayBuffer 转 Base64
 */
function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * AES 加密解密工具类
 */
class AESCrypto {
  private static instance: AESCrypto;

  private constructor() {}

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
   * 生成随机 AES-256 密钥
   * @returns Base64 编码的 32 字节密钥
   */
  public generateKey(): string {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    return bufferToBase64(keyBytes);
  }

  /**
   * 使用 AES-GCM 解密数据
   * @param encryptedBase64 Base64 编码的加密数据
   * @param keyBase64 Base64 编码的 AES 密钥
   * @param ivBase64 Base64 编码的 IV
   * @param authTagBase64 Base64 编码的认证标签
   * @returns 解密后的数据对象
   */
  public async decrypt(
    encryptedBase64: string,
    keyBase64: string,
    ivBase64: string,
    authTagBase64: string
  ): Promise<any> {
    try {
      console.log('[AES] Starting decryption...');
      console.log('[AES] Encrypted data length:', encryptedBase64.length);
      console.log('[AES] Key length:', keyBase64.length);
      console.log('[AES] IV length:', ivBase64.length);
      console.log('[AES] AuthTag length:', authTagBase64.length);

      // 解码参数
      const ciphertext = base64ToBuffer(encryptedBase64);
      const key = base64ToBuffer(keyBase64);
      const iv = base64ToBuffer(ivBase64);
      const authTag = base64ToBuffer(authTagBase64);

      console.log('[AES] Ciphertext buffer length:', ciphertext.length);
      console.log('[AES] Key buffer length:', key.length);
      console.log('[AES] IV buffer length:', iv.length);
      console.log('[AES] AuthTag buffer length:', authTag.length);

      // 合并 ciphertext 和 authTag
      const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
      encryptedBuffer.set(ciphertext, 0);
      encryptedBuffer.set(authTag, ciphertext.length);

      console.log('[AES] Combined buffer length:', encryptedBuffer.length);

      // 导入密钥
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      console.log('[AES] Key imported successfully');

      // 解密数据
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
          tagLength: 128 // 16 bytes = 128 bits
        },
        cryptoKey,
        encryptedBuffer as BufferSource
      );

      console.log('[AES] Data decrypted successfully');

      // 转换为字符串
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      console.log('[AES] Decrypted text length:', decryptedText.length);

      // 尝试解析为 JSON
      try {
        const parsed = JSON.parse(decryptedText);
        console.log('[AES] Parsed as JSON successfully');
        return parsed;
      } catch {
        console.log('[AES] Not JSON, returning as text');
        return decryptedText;
      }
    } catch (error) {
      console.error('[AES] Decryption failed:', error);
      console.error('[AES] Error details:', error instanceof Error ? error.message : String(error));
      throw new Error(`AES decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 使用 AES-GCM 加密数据（通常不需要，后端会加密响应）
   * @param data 要加密的数据
   * @param keyBase64 Base64 编码的 AES 密钥
   * @returns 包含加密数据、IV 和认证标签的对象
   */
  public async encrypt(
    data: any,
    keyBase64: string
  ): Promise<{ data: string; iv: string; authTag: string }> {
    try {
      // 将数据转换为字符串
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);

      // 解码密钥
      const key = base64ToBuffer(keyBase64);

      // 生成随机 IV (12 bytes for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 导入密钥
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // 加密数据
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
          tagLength: 128 // 16 bytes auth tag
        },
        cryptoKey,
        dataBuffer as BufferSource
      );

      // GCM 模式会在加密数据末尾附加 authTag
      const encrypted = new Uint8Array(encryptedBuffer);
      const ciphertext = encrypted.slice(0, -16); // 去掉最后 16 字节的 authTag
      const authTag = encrypted.slice(-16); // 最后 16 字节是 authTag

      return {
        data: bufferToBase64(ciphertext),
        iv: bufferToBase64(iv),
        authTag: bufferToBase64(authTag)
      };
    } catch (error) {
      console.error('[AES] Encryption failed:', error);
      throw new Error(`AES encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出单例实例
export const aesCrypto = AESCrypto.getInstance();
