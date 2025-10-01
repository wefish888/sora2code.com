import { Router } from 'express';
import { codesRouter } from './codes.routes';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { adminRouter } from './admin.routes';
import { healthRouter } from './health.routes';
import { cryptoRouter } from './crypto.routes';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 健康检查路由（无需认证）
router.use('/health', healthRouter);

// 加密相关路由（无需认证）
router.use('/crypto', cryptoRouter);

// 认证相关路由
router.use('/auth', authRouter);

// 代码相关路由（部分需要认证）
router.use('/codes', codesRouter);

// 用户相关路由（需要认证）
router.use('/users', authMiddleware, userRouter);

// 管理员路由（需要管理员权限）
router.use('/admin', adminRouter);

// API根路径信息
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Sora2Code API - sora2 invite code Collection Service',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      crypto: '/api/crypto',
      auth: '/api/auth',
      codes: '/api/codes',
      users: '/api/users',
      admin: '/api/admin'
    }
  });
});

export default router;