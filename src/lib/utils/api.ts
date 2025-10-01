import { aesCrypto } from './aes';
import { rsaCrypto } from './rsa';

/**
 * API 请求配置接口
 */
interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  skipEncryption?: boolean; // 跳过加密（用于白名单路由）
}

/**
 * 加密响应接口
 */
interface EncryptedResponse {
  encrypted: true;
  data: string;
  iv: string;
  authTag: string;
}

/**
 * 获取 API 基础 URL
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8787';
  }
  return import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8787';
};

/**
 * AES 密钥管理（存储在内存中）
 */
class AESKeyManager {
  private static instance: AESKeyManager;
  private aesKey: string | null = null;

  private constructor() {}

  public static getInstance(): AESKeyManager {
    if (!AESKeyManager.instance) {
      AESKeyManager.instance = new AESKeyManager();
    }
    return AESKeyManager.instance;
  }

  /**
   * 获取或生成 AES 密钥
   */
  public getKey(): string {
    if (!this.aesKey) {
      console.log('[API] Generating new AES key');
      this.aesKey = aesCrypto.generateKey();
    }
    return this.aesKey;
  }

  /**
   * 清除密钥（用于安全退出或密钥轮换）
   */
  public clearKey(): void {
    this.aesKey = null;
    console.log('[API] AES key cleared');
  }

  /**
   * 轮换密钥
   */
  public rotateKey(): string {
    console.log('[API] Rotating AES key');
    this.aesKey = aesCrypto.generateKey();
    return this.aesKey;
  }
}

const keyManager = AESKeyManager.getInstance();

/**
 * 检查响应是否为加密响应
 */
function isEncryptedResponse(data: any): data is EncryptedResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.encrypted === true &&
    typeof data.data === 'string' &&
    typeof data.iv === 'string' &&
    typeof data.authTag === 'string'
  );
}

/**
 * 发起 API 请求（自动处理加密）
 */
export async function apiRequest<T = any>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    skipEncryption = false
  } = config;

  const apiBaseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint}`;

  console.log(`[API] ${method} ${url}`);

  let requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  let requestBody: string | undefined;

  // 如果不跳过加密，添加 AES 密钥到请求头
  // 注意：Cloudflare Workers部署时直接发送base64编码的AES密钥（通过HTTPS保护）
  // 如果需要RSA加密，可以在非Workers环境中启用
  if (!skipEncryption) {
    const aesKey = keyManager.getKey();

    // 检测是否为Cloudflare Workers环境（通过API URL判断）
    const isCloudflareWorkers = apiBaseUrl.includes('sora2code.com');

    if (isCloudflareWorkers) {
      // Cloudflare Workers: 直接发送base64密钥（HTTPS保护）
      requestHeaders['X-AES-Key'] = aesKey;
      console.log('[API] Added AES key to request headers (Cloudflare Workers mode)');
    } else {
      // 传统服务器: 使用RSA加密AES密钥
      if (!rsaCrypto.hasPublicKey()) {
        console.log('[API] Fetching RSA public key...');
        await rsaCrypto.fetchPublicKey(apiBaseUrl);
      }
      const encryptedAesKey = rsaCrypto.encrypt(aesKey);
      requestHeaders['X-AES-Key'] = encryptedAesKey;
      console.log('[API] Added encrypted AES key to request headers (Express mode)');
    }
  }

  // 准备请求体
  if (body) {
    requestBody = JSON.stringify(body);
  }

  // 发起请求
  try {
    console.log('[API] Sending request...');
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: 'include'
    });

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Request failed: ${response.status}`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseData = await response.json() as any;

    // 检查响应是否加密
    if (isEncryptedResponse(responseData)) {
      console.log('[API] Response is encrypted, decrypting...');

      try {
        const aesKey = keyManager.getKey();
        const decryptedData = await aesCrypto.decrypt(
          responseData.data,
          aesKey,
          responseData.iv,
          responseData.authTag
        );

        console.log('[API] Response decrypted successfully');
        return decryptedData as T;
      } catch (error) {
        console.error('[API] Failed to decrypt response:', error);
        throw new Error(`Failed to decrypt response: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 如果响应未加密，返回原始数据
    console.log('[API] Response is not encrypted');
    return responseData as T;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}

/**
 * 便捷的 GET 请求方法
 */
export const apiGet = <T = any>(
  endpoint: string,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...config, method: 'GET' });
};

/**
 * 便捷的 POST 请求方法
 */
export const apiPost = <T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...config, method: 'POST', body });
};

/**
 * 便捷的 PUT 请求方法
 */
export const apiPut = <T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...config, method: 'PUT', body });
};

/**
 * 便捷的 DELETE 请求方法
 */
export const apiDelete = <T = any>(
  endpoint: string,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...config, method: 'DELETE' });
};

/**
 * 便捷的 PATCH 请求方法
 */
export const apiPatch = <T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...config, method: 'PATCH', body });
};

/**
 * 清除 AES 密钥（用于安全退出）
 */
export const clearEncryptionKey = (): void => {
  keyManager.clearKey();
};

/**
 * 轮换 AES 密钥（用于定期密钥更新）
 */
export const rotateEncryptionKey = (): void => {
  keyManager.rotateKey();
};
