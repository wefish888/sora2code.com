# 🚀 sora2code 后端快速部署指南

## 📋 前置要求

- Docker 和 Docker Compose
- 服务器（至少2GB内存，10GB存储）
- 域名和SSL证书

## ⚡ 快速部署步骤

### 1. 准备服务器

```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 克隆项目

```bash
git clone <your-repo>
cd sora2code.com/backend
```

### 3. 配置环境

```bash
# 复制生产环境配置
cp .env.production .env.production.local

# 编辑配置文件
nano .env.production
```

**必须修改的配置：**
```env
# 安全密钥（使用强随机字符串）
JWT_SECRET=your-super-strong-jwt-secret-here
JWT_REFRESH_SECRET=your-super-strong-refresh-secret-here

# 域名配置
ALLOWED_ORIGINS=https://sora2code.com,https://www.sora2code.com
FRONTEND_URL=https://sora2code.com

# Reddit API配置
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USERNAME=your-reddit-username
REDDIT_PASSWORD=your-reddit-password

# 邮箱配置（可选）
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. SSL证书设置

```bash
# 创建SSL目录
mkdir -p ssl

# 复制SSL证书
cp /path/to/your/cert.pem ssl/cert.pem
cp /path/to/your/key.pem ssl/key.pem
```

### 5. 一键部署

```bash
# 运行部署脚本
chmod +x deploy.sh
./deploy.sh production
```

## 🎯 验证部署

```bash
# 检查服务状态
docker-compose ps

# 检查健康状态
curl http://localhost:3000/health

# 查看日志
docker-compose logs -f sora2code-api
```

## 🔧 常用命令

```bash
# 查看日志
npm run logs

# 重启服务
npm run restart

# 停止服务
npm run stop

# 健康检查
npm run health

# 重新部署
npm run deploy
```

## 🌐 访问地址

部署成功后，API将在以下地址可用：

- **HTTP**: http://your-server-ip:3000
- **HTTPS**: https://sora2code.com (需要配置域名和SSL)

主要端点：
- `GET /health` - 健康检查
- `GET /api/v1/codes` - 获取代码列表
- `GET /api/v1/stats` - 获取统计信息
- `POST /api/v1/reddit/simulate` - Reddit监控模拟
- `POST /api/v1/reddit/monitor` - 真实Reddit监控

## 🔍 故障排除

### 服务无法启动
```bash
# 检查Docker日志
docker-compose logs sora2code-api

# 检查配置
docker-compose config
```

### 数据库问题
```bash
# 重新生成Prisma客户端
docker-compose exec sora2code-api npm run db:generate

# 运行数据库迁移
docker-compose exec sora2code-api npm run db:deploy
```

### SSL问题
```bash
# 验证证书
openssl x509 -in ssl/cert.pem -text -noout

# 测试HTTPS
curl -I https://sora2code.com/health
```

## 📊 监控和维护

### 日志监控
```bash
# 实时查看所有日志
docker-compose logs -f

# 只查看API日志
docker-compose logs -f sora2code-api

# 查看Nginx日志
docker-compose logs -f nginx
```

### 数据库备份
```bash
# 手动备份
docker-compose exec sora2code-api cp /app/data/production.db /app/backups/manual-backup-$(date +%Y%m%d).db

# 查看现有备份
ls -la backups/
```

### 性能监控
```bash
# 查看资源使用
docker stats

# 查看服务状态
docker-compose ps
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新部署
./deploy.sh production
```

## 🆘 紧急回滚

如果部署出现问题：

```bash
# 停止服务
docker-compose down

# 恢复数据库备份
cp backups/production-YYYYMMDD-HHMMSS.db data/production.db

# 回退到上一个版本
git checkout <previous-commit>

# 重新部署
./deploy.sh production
```

## 📞 技术支持

如遇问题，请检查：

1. **日志文件**: `docker-compose logs -f`
2. **健康检查**: `curl http://localhost:3000/health`
3. **服务状态**: `docker-compose ps`
4. **配置验证**: `docker-compose config`

常见问题解决方案详见 `DEPLOYMENT.md` 文档。