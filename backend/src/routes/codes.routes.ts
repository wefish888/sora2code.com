import { Router } from 'express';
import { CodesController } from '../controllers/codes.controller';
import { authMiddleware, optionalAuthMiddleware, requireVerified } from '../middleware/auth';
import { rateLimitMiddleware, copyRateLimit } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery, validateBody } from '../middleware/validation';
import { codesQuerySchema, reportCodeSchema, favoriteCodeSchema } from '../schemas/codes.schema';

const router = Router();

// 获取代码列表（公开，支持分页和筛选）
router.get(
  '/',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  validateQuery(codesQuerySchema),
  asyncHandler(CodesController.getCodes)
);

// 获取代码统计信息
router.get(
  '/stats',
  rateLimitMiddleware,
  asyncHandler(CodesController.getStats)
);

// 获取热门代码
router.get(
  '/trending',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  asyncHandler(CodesController.getTrendingCodes)
);

// 获取单个代码详情
router.get(
  '/:id',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  asyncHandler(CodesController.getCodeById)
);

// 复制代码（记录统计，需要频率限制）
router.post(
  '/:id/copy',
  copyRateLimit,
  optionalAuthMiddleware,
  asyncHandler(CodesController.copyCode)
);

// 报告代码问题（需要认证和邮箱验证）
router.post(
  '/:id/report',
  rateLimitMiddleware,
  authMiddleware,
  requireVerified,
  validateBody(reportCodeSchema),
  asyncHandler(CodesController.reportCode)
);

// 收藏/取消收藏代码（需要认证）
router.post(
  '/:id/favorite',
  rateLimitMiddleware,
  authMiddleware,
  validateBody(favoriteCodeSchema),
  asyncHandler(CodesController.toggleFavorite)
);

// 获取用户收藏的代码
router.get(
  '/favorites/my',
  rateLimitMiddleware,
  authMiddleware,
  asyncHandler(CodesController.getUserFavorites)
);

// 搜索代码
router.get(
  '/search',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  validateQuery(codesQuerySchema),
  asyncHandler(CodesController.searchCodes)
);

// 投票 (点赞/踩)
router.post(
  '/:id/vote',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  asyncHandler(CodesController.voteCode)
);

// 取消投票
router.delete(
  '/:id/vote',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  asyncHandler(CodesController.removeVote)
);

// 获取投票状态
router.get(
  '/:id/vote',
  rateLimitMiddleware,
  optionalAuthMiddleware,
  asyncHandler(CodesController.getVoteStatus)
);

export { router as codesRouter };