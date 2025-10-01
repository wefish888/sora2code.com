import bcrypt from 'bcryptjs';
import { prisma } from '../utils/database';
import { NotFoundError, ValidationError, UnauthorizedError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface UpdateProfileData {
  username?: string;
  bio?: string;
  avatar?: string;
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    defaultPlatform?: string;
    theme?: string;
    language?: string;
  };
}

interface ActivityFilter {
  page: number;
  limit: number;
  type?: string;
}

interface PremiumUpgradeData {
  plan: string;
  paymentMethod: string;
}

export class UserService {
  // 获取用户资料
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        avatar: true,
        role: true,
        isVerified: true,
        isPremium: true,
        premiumExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
        preferences: true,
        _count: {
          select: {
            favorites: true,
            activities: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      ...user,
      isPremium: user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())
    };
  }

  // 更新用户资料
  static async updateProfile(userId: string, data: UpdateProfileData) {
    const { username, bio, avatar, preferences } = data;

    // 如果更新用户名，检查是否已存在
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw new ValidationError('Username already taken');
      }
    }

    const updateData: any = {};

    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferences !== undefined) updateData.preferences = preferences;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        avatar: true,
        role: true,
        isVerified: true,
        isPremium: true,
        premiumExpiresAt: true,
        preferences: true
      }
    });

    // 记录更新事件
    await prisma.userActivity.create({
      data: {
        userId,
        action: 'profile_updated',
        metadata: JSON.stringify({
          fields: Object.keys(data)
        })
      }
    });

    return {
      ...updatedUser,
      isPremium: updatedUser.isPremium && (!updatedUser.premiumExpiresAt || updatedUser.premiumExpiresAt > new Date())
    };
  }

  // 修改密码
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    // 记录密码修改事件
    await prisma.userActivity.create({
      data: {
        userId,
        action: 'password_changed'
      }
    });

    logger.info('User password changed:', { userId });
  }

  // 删除账户
  static async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 使用事务删除用户及相关数据
    await prisma.$transaction([
      // 删除用户活动
      prisma.userActivity.deleteMany({
        where: { userId }
      }),
      // 删除收藏
      prisma.favorite.deleteMany({
        where: { userId }
      }),
      // 删除代码事件
      prisma.codeEvent.deleteMany({
        where: { userId }
      }),
      // 删除代码报告
      prisma.codeReport.deleteMany({
        where: { reportedBy: userId }
      }),
      // 最后删除用户
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    logger.info('User account deleted:', {
      userId,
      email: user.email
    });
  }

  // 获取用户统计数据
  static async getUserStats(userId: string) {
    const [
      favoritesCount,
      copiesCount,
      reportsCount,
      activeDays,
      recentActivity
    ] = await Promise.all([
      prisma.favorite.count({
        where: { userId }
      }),
      prisma.codeEvent.count({
        where: {
          userId,
          eventType: 'copy'
        }
      }),
      prisma.codeReport.count({
        where: { reportedBy: userId }
      }),
      prisma.userActivity.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        }
      }).then(activities => activities.length),
      prisma.userActivity.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
          }
        }
      })
    ]);

    return {
      favoritesCount,
      copiesCount,
      reportsCount,
      activeDays,
      recentActivity
    };
  }

  // 获取用户活动历史
  static async getUserActivity(userId: string, filters: ActivityFilter) {
    const { page, limit, type } = filters;
    const offset = (page - 1) * limit;

    const where: any = { userId };
    if (type) {
      where.action = type;
    }

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.userActivity.count({ where })
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // 升级到高级会员
  static async upgradeToPremium(userId: string, data: PremiumUpgradeData) {
    const { plan, paymentMethod } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
      throw new ValidationError('User already has an active premium subscription');
    }

    // 计算过期时间（这里简化处理，实际应该根据具体计划）
    const expirationDate = new Date();
    switch (plan) {
      case 'monthly':
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        break;
      case 'yearly':
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        break;
      default:
        throw new ValidationError('Invalid plan type');
    }

    // 更新用户为高级会员
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumExpiresAt: expirationDate
      }
    });

    // 记录升级事件
    await prisma.userActivity.create({
      data: {
        userId,
        action: 'premium_upgraded',
        metadata: JSON.stringify({
          plan,
          paymentMethod,
          expiresAt: expirationDate
        })
      }
    });

    // 这里应该集成支付处理
    // 实际应用中需要处理支付逻辑

    logger.info('User upgraded to premium:', {
      userId,
      plan,
      expiresAt: expirationDate
    });

    return {
      success: true,
      plan,
      expiresAt: expirationDate,
      paymentMethod
    };
  }

  // 取消高级会员
  static async cancelPremium(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isPremium) {
      throw new ValidationError('User does not have an active premium subscription');
    }

    // 取消高级会员（保留到当前周期结束）
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        premiumExpiresAt: null
      }
    });

    // 记录取消事件
    await prisma.userActivity.create({
      data: {
        userId,
        action: 'premium_cancelled'
      }
    });

    // 这里应该处理支付取消逻辑

    logger.info('User cancelled premium:', { userId });
  }
}