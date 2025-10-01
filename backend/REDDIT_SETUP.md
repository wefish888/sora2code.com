# Reddit API 配置指南

## 获取Reddit API密钥

要启用Reddit监控功能，您需要创建一个Reddit应用并获取API凭据。

### 步骤1: 创建Reddit应用

1. 访问 [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. 点击 "Create App" 或 "Create Another App"
3. 填写应用信息：
   - **名称**: sora2 code Monitor
   - **应用类型**: 选择 "script"
   - **描述**: sora2 shift codes monitoring tool
   - **关于URL**: https://sora2code.com (可选)
   - **重定向URI**: http://localhost:3000 (script类型不使用，但需要填写)

### 步骤2: 获取API凭据

创建应用后，您将看到：
- **Client ID**: 应用名称下方的字符串（14个字符）
- **Client Secret**: "secret"标签后的长字符串

### 步骤3: 配置环境变量

在 `.env` 文件中更新以下配置：

```env
# Reddit Integration
REDDIT_CLIENT_ID=你的客户端ID
REDDIT_CLIENT_SECRET=你的客户端密钥
REDDIT_USER_AGENT=sora2code/1.0.0 (https://sora2code.com)
REDDIT_USERNAME=你的Reddit用户名
REDDIT_PASSWORD=你的Reddit密码
REDDIT_SUBREDDIT=Borderlands
REDDIT_CHECK_INTERVAL=30
```

### 步骤4: 启用Reddit监控

在 `.env` 文件中设置：
```env
ENABLE_REDDIT_MONITORING=true
```

### 安全注意事项

1. **不要提交凭据**: 确保 `.env` 文件在 `.gitignore` 中
2. **使用专用账户**: 建议为监控创建专用的Reddit账户
3. **限制权限**: 该账户只需要读取权限
4. **定期轮换**: 定期更换密码和重新生成密钥

### API使用限制

Reddit API有以下限制：
- 每分钟60个请求
- 需要合适的User-Agent字符串
- 避免过于频繁的请求

### 测试配置

配置完成后，您可以通过以下方式测试：

1. 重启后端服务器
2. 调用Reddit测试端点：
   ```bash
   curl -X POST http://localhost:3000/api/v1/reddit/test
   ```

### 故障排除

常见问题：
- **401 Unauthorized**: 检查用户名和密码
- **403 Forbidden**: 检查Client ID和Secret
- **429 Too Many Requests**: 减少请求频率
- **User-Agent错误**: 确保User-Agent格式正确

如需帮助，请查看Reddit API文档：https://www.reddit.com/dev/api/