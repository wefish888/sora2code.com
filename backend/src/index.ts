import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimitMiddleware } from './middleware/rateLimiter';
import { rsaCryptoMiddleware } from './middleware/rsaCrypto';
// import { authMiddleware } from './middleware/auth';

import apiRoutes from './routes';
import { logger } from './utils/logger';
import { connectDatabase } from './utils/database';
import { connectRedis } from './utils/redis';
// import { EmailService } from './services/email.service';
import { ClaudeService } from './services/claude.service';
import { rsaCrypto } from './utils/rsa';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:4321',
  'http://localhost:4322',
  'http://localhost:4323',
  'https://sora2code.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（移动应用、Postman等）
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Encryption', 'X-AES-Key'],
}));

// 基础中间件
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// 速率限制
app.use(rateLimitMiddleware);

// RSA 加解密中间件（全局应用）
app.use('/api/v1', rsaCryptoMiddleware);

// 健康检查端点
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API 路由
app.use('/api/v1', apiRoutes);

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 初始化 RSA 密钥对
    rsaCrypto.getPublicKey();
    logger.info('RSA encryption initialized');

    // 连接数据库
    await connectDatabase();
    logger.info('Database connected successfully');

    // 连接Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // 初始化邮件服务（已禁用）
    // EmailService.initialize();
    // logger.info('Email service initialized');

    // 启动Claude监控（如果启用）
    if (process.env.ENABLE_CLAUDE_MONITORING === 'true') {
      await ClaudeService.startMonitoring();
      logger.info('Claude monitoring started');
    } else {
      logger.info('Claude monitoring is disabled in .env (ENABLE_CLAUDE_MONITORING)');
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📱 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API endpoint: http://localhost:${PORT}/api/v1`);
      logger.info(`🔐 RSA encryption enabled for all API routes`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

