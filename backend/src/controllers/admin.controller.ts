import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { RedditService } from '../services/reddit.service';
import { logger } from '../utils/logger';
import { CacheService, CacheKeys } from '../utils/redis';

export class AdminController {
  // 获取所有代码（管理员视图）
  static async getAllCodes(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 50, status, platform, search } = req.query as any;

    const codes = await AdminService.getAllCodes({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      platform,
      search
    });

    res.json({
      success: true,
      data: codes
    });
  }

  // 创建代码
  static async createCode(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;
    const codeData = req.body;

    const code = await AdminService.createCode({
      ...codeData,
      createdBy: adminId
    });

    // 清除相关缓存
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Code created by admin:', {
      codeId: code.id,
      adminId,
      code: code.code
    });

    res.status(201).json({
      success: true,
      data: code
    });
  }

  // 更新代码
  static async updateCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const updateData = req.body;

    const updatedCode = await AdminService.updateCode(id, {
      ...updateData,
      updatedBy: adminId
    });

    // 清除相关缓存
    await CacheService.del(CacheKeys.code(id));
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Code updated by admin:', {
      codeId: id,
      adminId,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedCode
    });
  }

  // 删除代码
  static async deleteCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = (req as any).user.id;

    await AdminService.deleteCode(id, adminId);

    // 清除相关缓存
    await CacheService.del(CacheKeys.code(id));
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Code deleted by admin:', {
      codeId: id,
      adminId
    });

    res.json({
      success: true,
      message: 'Code deleted successfully'
    });
  }

  // 批量更新代码
  static async batchUpdateCodes(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;
    const { codeIds, updateData } = req.body;

    const result = await AdminService.batchUpdateCodes(codeIds, updateData, adminId);

    // 清除相关缓存
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Batch update by admin:', {
      adminId,
      codeCount: codeIds.length,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: result
    });
  }

  // 批量删除代码
  static async batchDeleteCodes(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;
    const { codeIds } = req.body;

    const result = await AdminService.batchDeleteCodes(codeIds, adminId);

    // 清除相关缓存
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Batch delete by admin:', {
      adminId,
      codeCount: codeIds.length
    });

    res.json({
      success: true,
      data: result
    });
  }

  // 获取所有用户
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 50, role, status, search } = req.query as any;

    const users = await AdminService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      status,
      search
    });

    res.json({
      success: true,
      data: users
    });
  }

  // 更新用户
  static async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const updateData = req.body;

    const updatedUser = await AdminService.updateUser(id, updateData, adminId);

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(id));

    logger.info('User updated by admin:', {
      userId: id,
      adminId,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedUser
    });
  }

  // 封禁用户
  static async banUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const { reason, duration } = req.body;

    await AdminService.banUser(id, {
      reason,
      duration,
      bannedBy: adminId
    });

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(id));

    logger.info('User banned by admin:', {
      userId: id,
      adminId,
      reason
    });

    res.json({
      success: true,
      message: 'User banned successfully'
    });
  }

  // 解封用户
  static async unbanUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = (req as any).user.id;

    await AdminService.unbanUser(id, adminId);

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(id));

    logger.info('User unbanned by admin:', {
      userId: id,
      adminId
    });

    res.json({
      success: true,
      message: 'User unbanned successfully'
    });
  }

  // 获取管理员仪表板
  static async getDashboard(req: Request, res: Response): Promise<void> {
    const cacheKey = `${CacheKeys.PREFIX}:admin:dashboard`;
    let cachedDashboard = await CacheService.get(cacheKey);

    if (cachedDashboard) {
      res.json({
        success: true,
        data: cachedDashboard,
        cached: true
      });
      return;
    }

    const dashboard = await AdminService.getDashboard();

    // 缓存仪表板数据（5分钟）
    await CacheService.set(cacheKey, dashboard, 300);

    res.json({
      success: true,
      data: dashboard
    });
  }

  // 获取分析数据
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    const { period = '7d', type = 'all' } = req.query as any;

    const analytics = await AdminService.getAnalytics({
      period,
      type
    });

    res.json({
      success: true,
      data: analytics
    });
  }

  // 获取系统配置
  static async getSystemConfig(req: Request, res: Response): Promise<void> {
    const config = await AdminService.getSystemConfig();

    res.json({
      success: true,
      data: config
    });
  }

  // 更新系统配置
  static async updateSystemConfig(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;
    const configData = req.body;

    const updatedConfig = await AdminService.updateSystemConfig(configData, adminId);

    logger.info('System config updated by admin:', {
      adminId,
      fields: Object.keys(configData)
    });

    res.json({
      success: true,
      data: updatedConfig
    });
  }

  // 获取Reddit监控状态
  static async getRedditMonitorStatus(req: Request, res: Response): Promise<void> {
    const status = await RedditService.getMonitorStatus();

    res.json({
      success: true,
      data: status
    });
  }

  // 重启Reddit监控
  static async restartRedditMonitor(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;

    await RedditService.restartMonitor();

    logger.info('Reddit monitor restarted by admin:', { adminId });

    res.json({
      success: true,
      message: 'Reddit monitor restarted successfully'
    });
  }

  // 获取Reddit日志
  static async getRedditLogs(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 100, level } = req.query as any;

    const logs = await RedditService.getLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      level
    });

    res.json({
      success: true,
      data: logs
    });
  }

  // 测试Reddit功能
  static async testRedditFunctionality(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;

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
        adminId,
        mockPost: mockRedditPost.title
      });

      // 测试代码提取功能
      const service = RedditService.getInstance();
      const extractedCodes = (service as any).extractCodesFromPost(mockRedditPost);

      res.json({
        success: true,
        message: 'Reddit functionality test completed',
        data: {
          mockPost: mockRedditPost,
          extractedCodes,
          codeCount: extractedCodes.length,
          testStatus: extractedCodes.length > 0 ? 'PASS' : 'FAIL'
        }
      });

    } catch (error) {
      logger.error('Reddit functionality test failed:', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.json({
        success: false,
        message: 'Reddit functionality test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 清除缓存
  static async clearCache(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user.id;
    const { pattern = '*' } = req.body;

    await CacheService.delPattern(`${CacheKeys.PREFIX}:${pattern}`);

    logger.info('Cache cleared by admin:', {
      adminId,
      pattern
    });

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  }

  // 获取缓存统计
  static async getCacheStats(req: Request, res: Response): Promise<void> {
    const stats = await AdminService.getCacheStats();

    res.json({
      success: true,
      data: stats
    });
  }
}