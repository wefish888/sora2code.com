import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { intensiveRateLimit } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import {
  createCodeSchema,
  updateCodeSchema,
  userManagementSchema,
  systemConfigSchema
} from '../schemas/admin.schema';

const router = Router();

// 所有管理员路由都需要认证和管理员权限
router.use(authMiddleware);
router.use(requireAdmin);

// 代码管理
router.get(
  '/codes',
  intensiveRateLimit,
  asyncHandler(AdminController.getAllCodes)
);

router.post(
  '/codes',
  intensiveRateLimit,
  validateBody(createCodeSchema),
  asyncHandler(AdminController.createCode)
);

router.put(
  '/codes/:id',
  intensiveRateLimit,
  validateBody(updateCodeSchema),
  asyncHandler(AdminController.updateCode)
);

router.delete(
  '/codes/:id',
  intensiveRateLimit,
  asyncHandler(AdminController.deleteCode)
);

// 批量操作
router.post(
  '/codes/batch-update',
  intensiveRateLimit,
  asyncHandler(AdminController.batchUpdateCodes)
);

router.post(
  '/codes/batch-delete',
  intensiveRateLimit,
  asyncHandler(AdminController.batchDeleteCodes)
);

// 用户管理
router.get(
  '/users',
  intensiveRateLimit,
  asyncHandler(AdminController.getAllUsers)
);

router.put(
  '/users/:id',
  intensiveRateLimit,
  validateBody(userManagementSchema),
  asyncHandler(AdminController.updateUser)
);

router.post(
  '/users/:id/ban',
  intensiveRateLimit,
  asyncHandler(AdminController.banUser)
);

router.post(
  '/users/:id/unban',
  intensiveRateLimit,
  asyncHandler(AdminController.unbanUser)
);

// 系统统计
router.get(
  '/dashboard',
  intensiveRateLimit,
  asyncHandler(AdminController.getDashboard)
);

router.get(
  '/analytics',
  intensiveRateLimit,
  asyncHandler(AdminController.getAnalytics)
);

// 系统配置
router.get(
  '/config',
  intensiveRateLimit,
  asyncHandler(AdminController.getSystemConfig)
);

router.put(
  '/config',
  intensiveRateLimit,
  validateBody(systemConfigSchema),
  asyncHandler(AdminController.updateSystemConfig)
);

// Reddit 监控管理
router.get(
  '/reddit/status',
  intensiveRateLimit,
  asyncHandler(AdminController.getRedditMonitorStatus)
);

router.post(
  '/reddit/restart',
  intensiveRateLimit,
  asyncHandler(AdminController.restartRedditMonitor)
);

router.get(
  '/reddit/logs',
  intensiveRateLimit,
  asyncHandler(AdminController.getRedditLogs)
);


// 缓存管理
router.post(
  '/cache/clear',
  intensiveRateLimit,
  asyncHandler(AdminController.clearCache)
);

router.get(
  '/cache/stats',
  intensiveRateLimit,
  asyncHandler(AdminController.getCacheStats)
);

export { router as adminRouter };