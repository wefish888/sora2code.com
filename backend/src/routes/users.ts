import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../worker';
import { encryptionMiddleware } from '../middleware/encryption';

const userRoutes = new Hono<{ Bindings: Env }>();

// 应用强制加密中间件到所有路由
userRoutes.use('*', encryptionMiddleware);

// Basic user routes - simplified for Workers
userRoutes.get('/profile', async (c) => {
  // For now, return a simple response
  // In a full implementation, you'd extract user from JWT token
  return c.json({
    success: true,
    message: 'User profile endpoint (authentication required)'
  });
});

userRoutes.get('/favorites', async (c) => {
  // For now, return a simple response
  return c.json({
    success: true,
    data: [],
    message: 'User favorites endpoint (authentication required)'
  });
});

export { userRoutes };