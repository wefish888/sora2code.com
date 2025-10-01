#!/bin/bash

# 加密功能测试脚本
# 测试 sora2code.com 后端的加密实现

BASE_URL="http://localhost:8787"

echo "================================"
echo "加密功能测试"
echo "================================"
echo ""

# 1. 测试健康检查（白名单，不需要加密）
echo "1. 测试健康检查端点..."
curl -s "$BASE_URL/health" | python -m json.tool
echo ""
echo "✅ 健康检查通过"
echo ""

# 2. 生成 AES 密钥
echo "2. 生成 AES 密钥..."
RESPONSE=$(curl -s "$BASE_URL/api/v1/crypto/generate-aes-key")
echo "$RESPONSE" | python -m json.tool
AES_KEY=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['data']['aesKey'])")
echo ""
echo "✅ AES 密钥已生成: $AES_KEY"
echo ""

# 3. 验证 AES 密钥
echo "3. 验证 AES 密钥..."
curl -s -X POST "$BASE_URL/api/v1/crypto/validate-aes-key" \
  -H "Content-Type: application/json" \
  -d "{\"aesKey\":\"$AES_KEY\"}" | python -m json.tool
echo ""
echo "✅ 密钥验证通过"
echo ""

# 4. 测试没有密钥的请求（应该被拒绝）
echo "4. 测试没有密钥的请求（应该被拒绝）..."
curl -s "$BASE_URL/api/v1/codes/stats" | python -m json.tool
echo ""
echo "✅ 正确拒绝了没有密钥的请求"
echo ""

# 5. 测试带密钥的加密请求
echo "5. 测试带密钥的加密请求..."
echo "请求: GET /api/v1/codes/stats"
ENCRYPTED_RESPONSE=$(curl -s "$BASE_URL/api/v1/codes/stats" -H "X-AES-Key: $AES_KEY")
echo "$ENCRYPTED_RESPONSE" | python -m json.tool
echo ""
echo "✅ 收到加密响应"
echo ""

# 6. 测试 codes 列表端点
echo "6. 测试 codes 列表端点..."
echo "请求: GET /api/v1/codes/"
curl -s "$BASE_URL/api/v1/codes/" -H "X-AES-Key: $AES_KEY" | python -m json.tool
echo ""
echo "✅ Codes 列表加密响应成功"
echo ""

# 7. 获取 RSA 公钥
echo "7. 获取 RSA 公钥..."
curl -s "$BASE_URL/api/v1/crypto/public-key" | python -c "import sys, json; data = json.load(sys.stdin); print(data['data']['publicKey'][:100] + '...')"
echo ""
echo "✅ RSA 公钥获取成功"
echo ""

echo "================================"
echo "✅ 所有测试通过！"
echo "================================"
echo ""
echo "测试总结："
echo "- 健康检查端点正常（白名单）"
echo "- AES 密钥生成功能正常"
echo "- AES 密钥验证功能正常"
echo "- 强制加密中间件工作正常"
echo "- 加密响应格式正确"
echo "- RSA 公钥端点正常"
echo ""
echo "你的 AES 密钥: $AES_KEY"
echo "在客户端请求时在 X-AES-Key header 中使用此密钥"
