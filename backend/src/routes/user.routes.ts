import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { requireVerified } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { updateProfileSchema, changePasswordSchema } from '../schemas/user.schema';

const router = Router();

// 获取当前用户信息
router.get(
  '/profile',
  rateLimitMiddleware,
  asyncHandler(UserController.getProfile)
);

// 更新用户资料
router.put(
  '/profile',
  rateLimitMiddleware,
  requireVerified,
  validateBody(updateProfileSchema),
  asyncHandler(UserController.updateProfile)
);

// 修改密码
router.put(
  '/password',
  rateLimitMiddleware,
  requireVerified,
  validateBody(changePasswordSchema),
  asyncHandler(UserController.changePassword)
);

// 删除账户
router.delete(
  '/account',
  rateLimitMiddleware,
  requireVerified,
  asyncHandler(UserController.deleteAccount)
);

// 获取用户统计数据
router.get(
  '/stats',
  rateLimitMiddleware,
  asyncHandler(UserController.getUserStats)
);

// 获取用户活动历史
router.get(
  '/activity',
  rateLimitMiddleware,
  asyncHandler(UserController.getUserActivity)
);

// 升级到高级会员
router.post(
  '/upgrade',
  rateLimitMiddleware,
  requireVerified,
  asyncHandler(UserController.upgradeToPremium)
);

// 取消高级会员
router.post(
  '/downgrade',
  rateLimitMiddleware,
  requireVerified,
  asyncHandler(UserController.cancelPremium)
);

export { router as userRouter };