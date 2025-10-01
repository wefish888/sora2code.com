import forge from 'node-forge';

/**
 * RSA 加密工具类
 * 用于前端数据加密
 */
class RSACrypto {
  private static instance: RSACrypto;
  private publicKey: forge.pki.rsa.PublicKey | null = null;
  private publicKeyPem: string = '';

  private constructor() {}

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
   * 从服务器获取公钥
   * @param apiBaseUrl API 基础地址
   */
  public async fetchPublicKey(apiBaseUrl: string): Promise<void> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/crypto/public-key`);

      if (!response.ok) {
        throw new Error(`Failed to fetch public key: ${response.status}`);
      }

      const result = await response.json() as any;

      if (!result.success || !result.data.publicKey) {
        throw new Error('Invalid public key response');
      }

      this.publicKeyPem = result.data.publicKey;
      this.publicKey = forge.pki.publicKeyFromPem(this.publicKeyPem);

      console.log('[RSA] Public key fetched successfully');
    } catch (error) {
      console.error('[RSA] Failed to fetch public key:', error);
      throw error;
    }
  }

  /**
   * 设置公钥（如果已经有公钥）
   * @param publicKeyPem PEM 格式的公钥
   */
  public setPublicKey(publicKeyPem: string): void {
    this.publicKeyPem = publicKeyPem;
    this.publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  }

  /**
   * 获取当前公钥
   */
  public getPublicKey(): string {
    return this.publicKeyPem;
  }

  /**
   * 检查是否已设置公钥
   */
  public hasPublicKey(): boolean {
    return this.publicKey !== null;
  }

  /**
   * 加密数据
   * @param data 要加密的数据（字符串或对象）
   * @returns Base64 编码的加密字符串
   */
  public encrypt(data: any): string {
    if (!this.publicKey) {
      throw new Error('Public key not set. Call fetchPublicKey() first.');
    }

    try {
      // 如果是对象，转换为 JSON 字符串；如果已经是字符串，直接使用
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // 使用公钥加密（OAEP with SHA-256，与后端匹配）
      const encrypted = this.publicKey.encrypt(dataString, 'RSA-OAEP', {
        md: forge.md.sha256.create()
      });

      // 转换为 Base64
      return forge.util.encode64(encrypted);
    } catch (error) {
      console.error('[RSA] Encryption failed:', error);
      throw error;
    }
  }

  /**
   * 解密数据（用于解密服务器响应）
   * 注意：前端通常不解密，因为没有私钥
   * 这个方法主要用于测试或特殊场景
   * @param encryptedData Base64 编码的加密数据
   * @returns 解密后的数据对象
   */
  public decrypt(_encryptedData: string): any {
    throw new Error('Client-side decryption is not supported (no private key)');
  }

  /**
   * 清除公钥
   */
  public clearPublicKey(): void {
    this.publicKey = null;
    this.publicKeyPem = '';
  }
}

// 导出单例实例
export const rsaCrypto = RSACrypto.getInstance();