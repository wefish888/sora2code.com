import { Request, Response } from 'express';
import { checkRedisHealth } from '../utils/redis';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { RedditService } from '../services/reddit.service';

export class HealthController {
  // 基础健康检查
  static async basicHealth(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  }

  // 详细健康检查
  static async detailedHealth(req: Request, res: Response): Promise<void> {
    const checks = {
      api: true,
      database: false,
      cache: false,
      memory: false
    };

    let overallStatus = 'healthy';

    try {
      // 数据库连接检查
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      overallStatus = 'unhealthy';
    }

    try {
      // 缓存连接检查
      checks.cache = await checkRedisHealth();
      if (!checks.cache) {
        overallStatus = 'unhealthy';
      }
    } catch (error) {
      logger.error('Cache health check failed:', error);
      overallStatus = 'unhealthy';
    }

    // 内存使用检查
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    checks.memory = memoryUsageMB < 500; // 内存使用低于500MB为健康

    if (!checks.memory) {
      overallStatus = 'degraded';
    }

    const healthData = {
      success: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
      system: {
        memory: {
          used: Math.round(memoryUsageMB),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthData);
  }

  // 就绪状态检查（Kubernetes readiness probe）
  static async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // 检查关键服务是否就绪
      await prisma.$queryRaw`SELECT 1`;
      const redisHealthy = await checkRedisHealth();

      if (redisHealthy) {
        res.json({
          success: true,
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: 'Cache connection failed'
        });
      }
    } catch (error) {
      logger.error('Readiness check failed:', error);
      res.status(503).json({
        success: false,
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      });
    }
  }

  // 存活状态检查（Kubernetes liveness probe）
  static async livenessCheck(req: Request, res: Response): Promise<void> {
    // 简单的存活检查 - 如果能响应就说明进程还活着
    res.json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  // Reddit功能测试端点（无需认证）
  static async testRedditFunctionality(req: Request, res: Response): Promise<void> {
    try {
      // 创建测试用的模拟Reddit帖子数据
      const mockRedditPost = {
        id: 'test_' + Date.now(),
        title: 'New sora2 Shift Codes - Golden Keys!',
        selftext: 'Here are some new codes: KXKBT-JJTHW-T3TBB-T3TJ3-6XJXZ for PC, Xbox, and PlayStation. These codes give you 3 Golden Keys!',
        url: 'https://reddit.com/r/Borderlands/test',
        created_utc: Math.floor(Date.now() / 1000),
        author: 'test_user',
        score: 50,
        num_comments: 10,
        permalink: '/r/Borderlands/test'
      };

      logger.info('Testing Reddit functionality with mock data:', {
        mockPost: mockRedditPost.title
      });

      // 测试代码提取功能
      const service = RedditService.getInstance();
      const extractedCodes = (service as any).extractCodesFromPost(mockRedditPost);

      // 获取监控状态
      const monitorStatus = RedditService.getMonitorStatus();

      res.json({
        success: true,
        message: 'Reddit functionality test completed',
        data: {
          mockPost: mockRedditPost,
          extractedCodes,
          codeCount: extractedCodes.length,
          testStatus: extractedCodes.length > 0 ? 'PASS' : 'FAIL',
          monitorStatus
        }
      });

    } catch (error) {
      logger.error('Reddit functionality test failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Reddit functionality test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 手动采集Reddit代码端点（无需认证）
  static async collectRedditCodes(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual Reddit code collection started');

      const service = RedditService.getInstance();

      // 手动触发一次检查
      await (service as any).checkForNewCodes();

      // 获取监控状态
      const monitorStatus = RedditService.getMonitorStatus();

      res.json({
        success: true,
        message: 'Manual Reddit code collection completed',
        data: {
          monitorStatus,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Manual Reddit code collection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Manual Reddit code collection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}