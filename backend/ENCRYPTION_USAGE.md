# 加密 API 使用指南

## 概述

sora2code.com 后端 API 使用端到端加密保护所有敏感数据传输。本文档说明如何在客户端实现加密通信。

## 加密方式

- **传输加密**: HTTPS (TLS 1.3)
- **数据加密**: AES-256-GCM
- **密钥交换**: RSA-OAEP 2048 (可选)

## 快速开始

### 1. 获取 AES 密钥

**方法 A: 服务端生成（推荐用于测试）**

```bash
curl http://localhost:8787/api/v1/crypto/generate-aes-key
```

响应：
```json
{
  "success": true,
  "data": {
    "aesKey": "RTDn+zBr+2l59tp9uNFu5qDcNq9Faka8SG+XaSFbgH8=",
    "keySize": 256,
    "keyBytes": 32,
    "algorithm": "AES-GCM"
  }
}
```

**方法 B: 客户端生成（推荐用于生产）**

JavaScript:
```javascript
// 生成 32 字节随机密钥
const aesKey = crypto.getRandomValues(new Uint8Array(32));

// 转换为 Base64
const aesKeyBase64 = btoa(String.fromCharCode(...aesKey));

console.log('AES Key:', aesKeyBase64);
```

### 2. 发送加密请求

在所有 API 请求中包含 `X-AES-Key` header：

```bash
curl http://localhost:8787/api/v1/codes/stats \
  -H "X-AES-Key: RTDn+zBr+2l59tp9uNFu5qDcNq9Faka8SG+XaSFbgH8="
```

### 3. 解密响应

响应格式：
```json
{
  "encrypted": true,
  "data": "jCk46n283tuGCqBsMaWyPngialUnikSbIC22bLyo...",
  "iv": "yMh0R91XIPrpUmeg",
  "authTag": "LBCAk+QdK1+Z8PGfnOFZjA=="
}
```

JavaScript 解密示例：
```javascript
async function decryptResponse(encryptedData, aesKeyBase64) {
  // Base64 解码
  const data = base64ToBuffer(encryptedData.data);
  const iv = base64ToBuffer(encryptedData.iv);
  const authTag = base64ToBuffer(encryptedData.authTag);
  const keyBuffer = base64ToBuffer(aesKeyBase64);

  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 合并 data + authTag
  const encryptedBuffer = new Uint8Array([...data, ...authTag]);

  // 解密
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    cryptoKey,
    encryptedBuffer
  );

  // 转换为 JSON
  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

// 辅助函数
function base64ToBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
```

## 完整的客户端实现

```javascript
class EncryptedAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.aesKey = null;
  }

  // 初始化 - 生成 AES 密钥
  async initialize() {
    // 生成随机 AES-256 密钥
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    this.aesKey = btoa(String.fromCharCode(...keyBytes));
    console.log('Client initialized with AES key');
  }

  // 发送请求
  async request(endpoint, options = {}) {
    if (!this.aesKey) {
      await this.initialize();
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-AES-Key': this.aesKey,
        ...options.headers
      }
    });

    const data = await response.json();

    // 如果响应已加密，解密它
    if (data.encrypted) {
      return await this.decrypt(data);
    }

    return data;
  }

  // 解密响应
  async decrypt(encryptedData) {
    const data = this.base64ToBuffer(encryptedData.data);
    const iv = this.base64ToBuffer(encryptedData.iv);
    const authTag = this.base64ToBuffer(encryptedData.authTag);
    const keyBuffer = this.base64ToBuffer(this.aesKey);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const encryptedBuffer = new Uint8Array([...data, ...authTag]);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      encryptedBuffer
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  }

  base64ToBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

// 使用示例
const client = new EncryptedAPIClient('http://localhost:8787');

// 自动初始化并发送请求
const stats = await client.request('/api/v1/codes/stats');
console.log('Decrypted stats:', stats);

const codes = await client.request('/api/v1/codes/');
console.log('Decrypted codes:', codes);
```

## API 端点

### 公共端点（无需加密）

#### 获取 RSA 公钥
```
GET /api/v1/crypto/public-key
```

#### 生成 AES 密钥
```
GET /api/v1/crypto/generate-aes-key
```

#### 验证 AES 密钥
```
POST /api/v1/crypto/validate-aes-key
Body: { "aesKey": "your-base64-key" }
```

#### 健康检查
```
GET /health
```

### 加密端点（需要 X-AES-Key）

所有以下端点都需要在请求头中包含 `X-AES-Key`：

- `GET /api/v1/codes/` - 获取 codes 列表
- `GET /api/v1/codes/stats` - 获取统计信息
- `GET /api/v1/codes/:id` - 获取单个 code
- `POST /api/v1/codes/:id/copy` - 复制 code
- `POST /api/v1/codes/:id/report` - 报告 code
- `POST /api/v1/auth/*` - 所有认证端点
- `GET /api/v1/users/*` - 所有用户端点

## 错误处理

### 缺少 AES 密钥
```json
{
  "success": false,
  "error": "Encryption Required",
  "message": "X-AES-Key header is required for all API requests"
}
```

### 无效的 AES 密钥
```json
{
  "success": false,
  "error": "Encryption Failed",
  "message": "Invalid AES key length: 16 bytes (expected 32 bytes for AES-256)"
}
```

## 安全最佳实践

1. **密钥管理**
   - 在客户端生成 AES 密钥
   - 不要在日志中记录密钥
   - 定期轮换密钥（建议每 24 小时）

2. **密钥存储**
   - 仅在内存中存储密钥
   - 不要持久化到 localStorage 或 sessionStorage
   - 使用 sessionStorage 仅在必要时短期缓存

3. **传输安全**
   - 始终使用 HTTPS
   - 验证服务器证书
   - 实施证书固定（可选）

4. **错误处理**
   - 不要在错误消息中暴露敏感信息
   - 记录加密失败但不记录密钥内容

## 测试

运行加密测试套件：
```bash
cd backend
bash test-encryption.sh
```

## 故障排除

### 问题: "Invalid AES key length"
**解决方案**: 确保生成 32 字节（256 位）密钥

### 问题: "Invalid base64 string"
**解决方案**: 检查 Base64 编码是否正确，不要包含空格或换行符

### 问题: 解密失败
**解决方案**:
- 验证使用相同的 AES 密钥
- 检查 IV 和 AuthTag 是否正确传输
- 确保数据未在传输中损坏

## 支持

如有问题，请查看：
- [加密测试结果](./ENCRYPTION_TEST_RESULTS.md)
- [测试脚本](./test-encryption.sh)
- [GitHub Issues](https://github.com/your-repo/issues)
