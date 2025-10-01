import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// 基础健康检查
router.get('/', asyncHandler(HealthController.basicHealth));

// 详细健康检查（包括数据库和Redis连接）
router.get('/detailed', asyncHandler(HealthController.detailedHealth));

// 就绪状态检查
router.get('/ready', asyncHandler(HealthController.readinessCheck));

// 存活状态检查
router.get('/live', asyncHandler(HealthController.livenessCheck));

// Reddit功能测试（无需认证）
router.get('/test/reddit', asyncHandler(HealthController.testRedditFunctionality));

// 手动采集Reddit代码（无需认证）
router.post('/collect/reddit', asyncHandler(HealthController.collectRedditCodes));

export { router as healthRouter };