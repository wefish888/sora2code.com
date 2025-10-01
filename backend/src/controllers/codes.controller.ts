import { Request, Response } from 'express';
import { CodesService } from '../services/codes.service';
import { logger } from '../utils/logger';
import { CacheService, CacheKeys } from '../utils/redis';

export class CodesController {
  // 获取代码列表
  static async getCodes(req: Request, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 20,
      platform,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeExpired = false
    } = req.query as any;

    const filters = {
      platform,
      status,
      search,
      includeExpired,
      page,
      limit,
      sortBy,
      sortOrder
    };

    // 尝试从缓存获取
    const cacheKey = CacheKeys.codes(filters);
    let cachedResult = await CacheService.get(cacheKey);

    if (cachedResult) {
      res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
      return;
    }

    const result = await CodesService.getCodes(filters);

    // 缓存结果（5分钟）
    await CacheService.set(cacheKey, result, 300);

    res.json({
      success: true,
      data: result
    });
  }

  // 获取代码统计信息
  static async getStats(req: Request, res: Response): Promise<void> {
    const cacheKey = `${CacheKeys.PREFIX}:stats:global`;
    let cachedStats = await CacheService.get(cacheKey);

    if (cachedStats) {
      res.json({
        success: true,
        data: cachedStats,
        cached: true
      });
      return;
    }

    const stats = await CodesService.getGlobalStats();

    // 缓存统计数据（10分钟）
    await CacheService.set(cacheKey, stats, 600);

    res.json({
      success: true,
      data: stats
    });
  }

  // 获取热门代码
  static async getTrendingCodes(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query as any;

    const cacheKey = `${CacheKeys.PREFIX}:trending:${limit}`;
    let cachedTrending = await CacheService.get(cacheKey);

    if (cachedTrending) {
      res.json({
        success: true,
        data: cachedTrending,
        cached: true
      });
      return;
    }

    const trending = await CodesService.getTrendingCodes(parseInt(limit));

    // 缓存热门代码（15分钟）
    await CacheService.set(cacheKey, trending, 900);

    res.json({
      success: true,
      data: trending
    });
  }

  // 获取单个代码详情
  static async getCodeById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const cacheKey = CacheKeys.code(id);
    let cachedCode = await CacheService.get(cacheKey);

    if (cachedCode) {
      // 如果用户已登录，添加用户特定信息
      if (userId) {
        const userInfo = await CodesService.getUserCodeInfo(id, userId);
        cachedCode = { ...cachedCode, userInfo };
      }

      res.json({
        success: true,
        data: cachedCode,
        cached: true
      });
      return;
    }

    const code = await CodesService.getCodeById(id, userId);

    // 缓存代码详情（30分钟）
    await CacheService.set(cacheKey, code, 1800);

    res.json({
      success: true,
      data: code
    });
  }

  // 复制代码
  static async copyCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    await CodesService.recordCopy(id, {
      userId,
      userAgent,
      ip
    });

    // 清除相关缓存
    await CacheService.del(CacheKeys.code(id));
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);
    await CacheService.del(`${CacheKeys.PREFIX}:stats:global`);

    logger.info('Code copied:', {
      codeId: id,
      userId,
      ip
    });

    res.json({
      success: true,
      message: 'Code copy recorded'
    });
  }

  // 报告代码问题
  static async reportCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason, description, email } = req.body;
    const userId = (req as any).user.id;

    await CodesService.reportCode(id, {
      userId,
      reason,
      description,
      email
    });

    logger.info('Code reported:', {
      codeId: id,
      userId,
      reason
    });

    res.json({
      success: true,
      message: 'Code report submitted successfully'
    });
  }

  // 收藏/取消收藏代码
  static async toggleFavorite(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { action } = req.body;
    const userId = (req as any).user.id;

    const result = await CodesService.toggleFavorite(id, userId, action);

    // 清除用户相关缓存
    await CacheService.delPattern(`${CacheKeys.userProfile(userId)}*`);

    res.json({
      success: true,
      data: result
    });
  }

  // 获取用户收藏的代码
  static async getUserFavorites(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query as any;

    const favorites = await CodesService.getUserFavorites(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: favorites
    });
  }

  // 搜索代码
  static async searchCodes(req: Request, res: Response): Promise<void> {
    const {
      search,
      platform,
      status,
      page = 1,
      limit = 20
    } = req.query as any;

    if (!search || search.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Search query must be at least 2 characters long'
        }
      });
      return;
    }

    const searchParams = {
      search: search.trim(),
      platform,
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const results = await CodesService.searchCodes(searchParams);

    res.json({
      success: true,
      data: results
    });
  }

  // 投票 (点赞/踩)
  static async voteCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'
    const userId = (req as any).user?.id;
    const ip = req.ip;

    if (!['upvote', 'downvote'].includes(voteType)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid vote type. Must be "upvote" or "downvote"'
        }
      });
      return;
    }

    const result = await CodesService.voteCode(id, {
      userId,
      voteType,
      ipAddress: ip
    });

    // 清除相关缓存
    await CacheService.del(CacheKeys.code(id));
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Code voted:', {
      codeId: id,
      userId,
      voteType,
      ip
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully ${voteType}d the code`
    });
  }

  // 取消投票
  static async removeVote(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const ip = req.ip;

    const result = await CodesService.removeVote(id, { userId, ipAddress: ip });

    // 清除相关缓存
    await CacheService.del(CacheKeys.code(id));
    await CacheService.delPattern(`${CacheKeys.PREFIX}:codes:*`);

    logger.info('Vote removed:', {
      codeId: id,
      userId,
      ip
    });

    res.json({
      success: true,
      data: result,
      message: 'Vote removed successfully'
    });
  }

  // 获取代码投票状态
  static async getVoteStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const ip = req.ip;

    const voteStatus = await CodesService.getVoteStatus(id, { userId, ipAddress: ip });

    res.json({
      success: true,
      data: voteStatus
    });
  }
}