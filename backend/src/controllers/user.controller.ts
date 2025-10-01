import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';
import { CacheService, CacheKeys } from '../utils/redis';

export class UserController {
  // 获取当前用户信息
  static async getProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;

    const profile = await UserService.getUserProfile(userId);

    res.json({
      success: true,
      data: profile
    });
  }

  // 更新用户资料
  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const updateData = req.body;

    const updatedProfile = await UserService.updateProfile(userId, updateData);

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(userId));

    logger.info('User profile updated:', {
      userId,
      fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedProfile
    });
  }

  // 修改密码
  static async changePassword(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    await UserService.changePassword(userId, currentPassword, newPassword);

    logger.info('User password changed:', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  }

  // 删除账户
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const user = (req as any).user;

    await UserService.deleteAccount(userId);

    // 清除所有相关缓存
    await CacheService.delPattern(`${CacheKeys.PREFIX}:*${userId}*`);

    logger.info('User account deleted:', {
      userId,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  }

  // 获取用户统计数据
  static async getUserStats(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;

    const cacheKey = `${CacheKeys.PREFIX}:user_stats:${userId}`;
    let cachedStats = await CacheService.get(cacheKey);

    if (cachedStats) {
      res.json({
        success: true,
        data: cachedStats,
        cached: true
      });
      return;
    }

    const stats = await UserService.getUserStats(userId);

    // 缓存用户统计（1小时）
    await CacheService.set(cacheKey, stats, 3600);

    res.json({
      success: true,
      data: stats
    });
  }

  // 获取用户活动历史
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20, type } = req.query as any;

    const activity = await UserService.getUserActivity(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type
    });

    res.json({
      success: true,
      data: activity
    });
  }

  // 升级到高级会员
  static async upgradeToPremium(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;
    const { plan, paymentMethod } = req.body;

    const result = await UserService.upgradeToPremium(userId, {
      plan,
      paymentMethod
    });

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(userId));

    logger.info('User upgraded to premium:', {
      userId,
      plan
    });

    res.json({
      success: true,
      data: result
    });
  }

  // 取消高级会员
  static async cancelPremium(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.id;

    await UserService.cancelPremium(userId);

    // 清除用户缓存
    await CacheService.del(CacheKeys.userProfile(userId));

    logger.info('User cancelled premium:', { userId });

    res.json({
      success: true,
      message: 'Premium subscription cancelled successfully'
    });
  }
}