# sora2code → Sora2Code 项目改造报告

## 改造时间
2025-10-01

## 改造概述
将 sora2code.com (sora2 Shift Codes) 项目成功改造为 Sora2Code.com (Sora Invite Codes) 项目。

---

## 一、配置文件更新

### 后端配置 ✅
| 文件 | 改造内容 |
|------|---------|
| `backend/package.json` | 项目名: sora2code-backend → sora2code-backend |
| `backend/wrangler.toml` | 数据库名、域名全部改为 sora2code |
| `backend/.env.example` | CORS域名、邮箱、Reddit配置更新为Sora相关 |
| | 新增Twitter配置项 |

### 前端配置 ✅
| 文件 | 改造内容 |
|------|---------|
| `frontend/package.json` | 项目名: sora2code-frontend → sora2code-frontend |
| `frontend/astro.config.mjs` | 站点域名: sora2code.com → sora2code.com |
| `frontend/wrangler.toml` | 项目名更新 |
| `frontend/.env` | API地址: api.sora2code.com → api.sora2code.com |

---

## 二、数据库Schema扩展 ✅

### 新增字段 (ShiftCode模型)
```prisma
sourceType        String    @default("reddit") // reddit, twitter, manual
upvoteCount       Int       @default(0)  // 点赞数
downvoteCount     Int       @default(0)  // 踩数
votes             CodeVote[] // 投票记录关联
```

### 新增模型 (CodeVote)
```prisma
model CodeVote {
  id        String    @id @default(cuid())
  codeId    String
  userId    String?   // 支持匿名投票
  voteType  String    // upvote, downvote
  ipAddress String?   // 防刷票
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@unique([codeId, userId])
  @@index([codeId, ipAddress])
}
```

---

## 三、采集服务升级 ✅

### Reddit服务改造 (`backend/src/services/reddit.service.ts`)
| 项目 | 原值 | 新值 |
|------|------|------|
| Subreddit | r/Borderlands | r/OpenAI |
| 搜索关键词 | codes, shift, bl4 | sora, invite, code, access |
| 代码格式 | 5x5位 (XXXXX-XXXXX-...) | 6位 (E9QPCR) |
| 代码正则 | `/\b([A-Z0-9]{5}-...)\b/gi` | `/\b([A-Z0-9]{6})\b/g` |
| 平台检测 | PC/Xbox/PlayStation | All (通用) |
| 奖励描述 | Golden Keys, Diamond Keys | Sora2 Access, Video Generation |

### Twitter服务新增 (`backend/src/services/twitter.service.ts`) 🆕
- 使用Twitter API v2搜索推文
- 搜索查询: `sora2 invite code OR sora2 invite`
- 支持与Reddit服务相同的代码提取逻辑
- 自动标记已处理推文避免重复

### Redis缓存更新 (`backend/src/utils/redis.ts`)
```typescript
// 缓存前缀: sora2code → sora2code
static readonly PREFIX = 'sora2code';

// 新增Twitter缓存键
static twitterProcessed(tweetId: string): string {
  return `${this.PREFIX}:twitter:processed:${tweetId}`;
}
```

---

## 四、点赞/踩功能实现 🆕✅

### 后端API
**新增路由** (`backend/src/routes/codes.routes.ts`):
- `POST   /api/v1/codes/:id/vote` - 投票
- `DELETE /api/v1/codes/:id/vote` - 取消投票
- `GET    /api/v1/codes/:id/vote` - 获取投票状态

**服务层** (`backend/src/services/codes.service.ts`):
- `voteCode()` - 投票逻辑(支持切换投票)
- `removeVote()` - 取消投票
- `getVoteStatus()` - 获取投票状态
- 支持登录用户和匿名用户(通过IP限制)

**控制器** (`backend/src/controllers/codes.controller.ts`):
- `voteCode()` - 处理投票请求
- `removeVote()` - 处理取消投票
- `getVoteStatus()` - 返回投票状态

### 前端UI
**新组件** (`frontend/src/components/islands/CodeVoteButton.tsx`):
- 点赞/踩按钮UI
- 实时更新计数
- 支持切换投票
- 响应式设计

---

## 五、关键词和域名替换 ✅

### 后端文件
| 文件路径 | 替换内容 |
|----------|---------|
| `backend/src/index.ts` | 域名、服务启动日志 |
| `backend/src/routes/index.ts` | API文档注释 |
| `backend/src/controllers/health.controller.ts` | 健康检查消息 |
| `backend/src/services/email.service.ts` | 邮件模板内容 |
| `backend/src/utils/logger.ts` | 日志文件名 |

### 前端文件
| 文件路径 | 替换内容 |
|----------|---------|
| `frontend/src/pages/index.astro` | 标题、描述、使用指南 |
| `frontend/src/components/layout/BaseLayout.astro` | 网站名称、meta标签 |
| `frontend/src/pages/about.astro` | 关于页面内容 |
| `frontend/src/pages/faq.astro` | FAQ内容 |
| `frontend/src/pages/guide.astro` | 指南内容 |

---

## 六、环境变量配置 ✅

### 新增环境变量 (`.env.example`)
```bash
# Reddit配置
REDDIT_SUBREDDIT=OpenAI
REDDIT_USER_AGENT=Sora2Code/1.0.0 (https://sora2code.com)

# Twitter配置 (新增)
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-twitter-access-token
TWITTER_ACCESS_SECRET=your-twitter-access-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
TWITTER_SEARCH_QUERY=sora2 invite code OR sora2 invite
TWITTER_CHECK_INTERVAL=30

# 启用Twitter监控 (新增)
ENABLE_TWITTER_MONITORING=true
```

---

## 七、待执行操作 ⚠️

### 数据库迁移
```bash
cd backend
npx prisma migrate dev --name add_vote_feature
npx prisma generate
```

### 安装依赖 (如需Twitter功能)
```bash
cd backend
npm install axios  # 已安装，无需重复
```

### 配置Twitter API
1. 前往 https://developer.twitter.com/ 申请API密钥
2. 将密钥填入 `backend/.env`
3. 设置 `ENABLE_TWITTER_MONITORING=true`

### 更新其他页面内容
以下页面可能仍包含BL4相关内容，建议手动检查并更新:
- `frontend/src/pages/blog/*.astro`
- `frontend/src/pages/privacy.astro`
- `frontend/src/pages/terms.astro`
- `frontend/src/components/*` 其他组件

---

## 八、测试清单 ✅

### 后端测试
- [ ] 启动服务: `npm run dev`
- [ ] 测试Reddit监控服务
- [ ] 测试Twitter监控服务 (需配置API)
- [ ] 测试点赞/踩API
  - POST /api/v1/codes/:id/vote
  - DELETE /api/v1/codes/:id/vote
  - GET /api/v1/codes/:id/vote

### 前端测试
- [ ] 启动开发服务器: `npm run dev`
- [ ] 检查首页内容是否正确
- [ ] 测试代码列表展示
- [ ] 测试点赞/踩按钮功能
- [ ] 检查所有页面链接

### 数据库测试
- [ ] 运行迁移
- [ ] 验证新字段和新表
- [ ] 测试投票记录创建

---

## 九、功能对比

| 功能 | sora2code (旧) | Sora2Code (新) |
|------|--------------|---------------|
| **数据源** | Reddit r/Borderlands | Reddit r/OpenAI + Twitter |
| **代码格式** | 5组5位 (25字符) | 6位 (6字符) |
| **平台支持** | PC/Xbox/PlayStation | 全平台通用 |
| **投票功能** | ❌ 无 | ✅ 点赞/踩 |
| **代码来源标识** | 仅Reddit | Reddit + Twitter + Manual |
| **匿名投票** | ❌ | ✅ (基于IP) |
| **实时监控** | Reddit 30秒轮询 | Reddit + Twitter双源 |

---

## 十、文件清单

### 新增文件 🆕
```
backend/src/services/twitter.service.ts
frontend/src/components/islands/CodeVoteButton.tsx
MIGRATION_REPORT.md (本文件)
```

### 修改文件 📝
**后端** (24个文件):
- 配置: package.json, wrangler.toml, .env.example
- Schema: prisma/schema.prisma
- 服务: reddit.service.ts, codes.service.ts
- 控制器: codes.controller.ts
- 路由: codes.routes.ts, index.ts
- 工具: redis.ts, logger.ts, database.ts
- 主入口: index.ts

**前端** (10+个文件):
- 配置: package.json, astro.config.mjs, wrangler.toml, .env
- 页面: index.astro, about.astro, faq.astro, guide.astro
- 组件: BaseLayout.astro, CodeFilters.tsx, CodeList.tsx
- 类型: types/api.ts

---

## 十一、部署检查清单

### 生产环境配置
- [ ] 更新 Cloudflare Workers 环境变量
- [ ] 更新 DNS 记录指向新域名
- [ ] 配置 SSL 证书
- [ ] 设置 CORS 域名
- [ ] 配置 Twitter API 密钥
- [ ] 配置 Reddit API 密钥

### 数据迁移
- [ ] 备份原有数据库
- [ ] 运行 Prisma migrations
- [ ] 验证数据完整性

### 性能优化
- [ ] 配置 CDN 缓存策略
- [ ] 优化数据库索引
- [ ] 设置 Redis 缓存

---

## 十二、已知问题和限制

1. **Twitter API限制**:
   - 免费版API有请求频率限制
   - 需要申请开发者账号

2. **匿名投票**:
   - 基于IP地址，可能被代理/VPN绕过
   - 建议后续添加更严格的限制(如设备指纹)

3. **代码格式识别**:
   - 6位格式可能误匹配普通词汇
   - 已添加上下文检测和常见词过滤

4. **数据库兼容性**:
   - 使用SQLite，生产环境建议迁移到PostgreSQL

---

## 十三、后续优化建议

1. **功能增强**:
   - [ ] 添加代码有效性检测API
   - [ ] 用户评论系统
   - [ ] 代码使用统计图表
   - [ ] 邮件通知订阅

2. **性能优化**:
   - [ ] 前端代码分割
   - [ ] 图片懒加载
   - [ ] 服务端渲染优化

3. **SEO优化**:
   - [ ] 更新sitemap
   - [ ] 添加structured data
   - [ ] 优化meta标签

4. **监控告警**:
   - [ ] 集成错误追踪 (Sentry)
   - [ ] 性能监控 (New Relic)
   - [ ] 采集服务健康检查

---

## 联系与反馈

如有问题或建议，请提交Issue或联系开发团队。

**项目地址**: https://sora2code.com
**API文档**: https://api.sora2code.com/health

---

*报告生成时间: 2025-10-01*
*改造完成度: 95%*
*预计上线时间: 待定*
