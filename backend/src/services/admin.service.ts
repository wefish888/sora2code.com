import { prisma } from '../utils/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler';
// import { CacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';
import redis from '../utils/redis';

interface CodeFilters {
  page: number;
  limit: number;
  status?: string;
  platform?: string;
  search?: string;
}

interface UserFilters {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
}

interface CreateCodeData {
  code: string;
  rewardDescription?: string;
  platforms: string[];
  expiresAt?: string;
  sourceUrl?: string;
  sourceId?: string;
  notes?: string;
  status?: string;
  createdBy: string;
}

interface UpdateCodeData {
  code?: string;
  rewardDescription?: string;
  platforms?: string[];
  status?: string;
  expiresAt?: string;
  sourceUrl?: string;
  notes?: string;
  updatedBy: string;
}

interface BanData {
  reason: string;
  duration?: number; // hours
  bannedBy: string;
}

interface AnalyticsParams {
  period: string;
  type: string;
}

export class AdminService {
  // 获取所有代码（管理员视图）
  static async getAllCodes(filters: CodeFilters) {
    const { page, limit, status, platform, search } = filters;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platforms = {
        some: {
          platform: platform
        }
      };
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { rewardDescription: { contains: search, mode: 'insensitive' } },
        { sourceId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [codes, total] = await Promise.all([
      prisma.shiftCode.findMany({
        where,
        include: {
          platforms: true,
          createdBy: {
            select: { id: true, username: true, email: true }
          },
          updatedBy: {
            select: { id: true, username: true, email: true }
          },
          _count: {
            select: {
              copyEvents: true,
              favorites: true,
              reports: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.shiftCode.count({ where })
    ]);

    return {
      codes,
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

  // 创建代码
  static async createCode(data: CreateCodeData) {
    const { platforms, createdBy, ...codeData } = data;

    // 检查代码是否已存在
    const existingCode = await prisma.shiftCode.findUnique({
      where: { code: data.code }
    });

    if (existingCode) {
      throw new ValidationError('Code already exists');
    }

    const code = await prisma.$transaction(async (tx) => {
      // 创建代码
      const newCode = await tx.shiftCode.create({
        data: {
          ...codeData,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          createdBy: {
            connect: { id: createdBy }
          }
        }
      });

      // 创建平台关联
      const platformData = platforms.map(platform => ({
        codeId: newCode.id,
        platform
      }));

      await tx.codePlatform.createMany({
        data: platformData
      });

      return newCode;
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId: data.createdBy,
        action: 'create_code',
        resourceType: 'shiftCode',
        resourceId: code.id,
        metadata: JSON.stringify({
          code: data.code,
          platforms
        })
      }
    });

    return code;
  }

  // 更新代码
  static async updateCode(id: string, data: UpdateCodeData) {
    const { platforms, updatedBy, ...updateData } = data;

    const existingCode = await prisma.shiftCode.findUnique({
      where: { id }
    });

    if (!existingCode) {
      throw new NotFoundError('Code not found');
    }

    const updatedCode = await prisma.$transaction(async (tx) => {
      // 更新代码
      const code = await tx.shiftCode.update({
        where: { id },
        data: {
          ...updateData,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          updatedById: updatedBy
        }
      });

      // 如果有平台更新，先删除旧的再创建新的
      if (platforms) {
        await tx.codePlatform.deleteMany({
          where: { codeId: id }
        });

        const platformData = platforms.map(platform => ({
          codeId: id,
          platform
        }));

        await tx.codePlatform.createMany({
          data: platformData
        });
      }

      return code;
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId: updatedBy,
        action: 'update_code',
        resourceType: 'shiftCode',
        resourceId: id,
        metadata: JSON.stringify({
          fields: Object.keys(data),
          platforms
        })
      }
    });

    return updatedCode;
  }

  // 删除代码
  static async deleteCode(id: string, adminId: string) {
    const code = await prisma.shiftCode.findUnique({
      where: { id }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    await prisma.$transaction([
      // 删除平台关联
      prisma.codePlatform.deleteMany({
        where: { codeId: id }
      }),
      // 删除相关事件
      prisma.codeEvent.deleteMany({
        where: { codeId: id }
      }),
      // 删除收藏
      prisma.favorite.deleteMany({
        where: { codeId: id }
      }),
      // 删除报告
      prisma.codeReport.deleteMany({
        where: { codeId: id }
      }),
      // 删除代码
      prisma.shiftCode.delete({
        where: { id }
      })
    ]);

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'delete_code',
        resourceType: 'shiftCode',
        resourceId: id,
        metadata: JSON.stringify({
          code: code.code
        })
      }
    });
  }

  // 批量更新代码
  static async batchUpdateCodes(codeIds: string[], updateData: any, adminId: string) {
    const result = await prisma.shiftCode.updateMany({
      where: {
        id: { in: codeIds }
      },
      data: updateData
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'batch_update_codes',
        resourceType: 'shiftCode',
        metadata: JSON.stringify({
          codeIds,
          updateData,
          count: result.count
        })
      }
    });

    return result;
  }

  // 批量删除代码
  static async batchDeleteCodes(codeIds: string[], adminId: string) {
    await prisma.$transaction([
      // 删除相关数据
      prisma.codePlatform.deleteMany({
        where: { codeId: { in: codeIds } }
      }),
      prisma.codeEvent.deleteMany({
        where: { codeId: { in: codeIds } }
      }),
      prisma.favorite.deleteMany({
        where: { codeId: { in: codeIds } }
      }),
      prisma.codeReport.deleteMany({
        where: { codeId: { in: codeIds } }
      }),
      // 删除代码
      prisma.shiftCode.deleteMany({
        where: { id: { in: codeIds } }
      })
    ]);

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'batch_delete_codes',
        resourceType: 'shiftCode',
        metadata: JSON.stringify({
          codeIds,
          count: codeIds.length
        })
      }
    });

    return { deletedCount: codeIds.length };
  }

  // 获取所有用户
  static async getAllUsers(filters: UserFilters) {
    const { page, limit, role, status, search } = filters;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isVerified: true,
          isPremium: true,
          premiumExpiresAt: true,
          createdAt: true,
          lastLoginAt: true,
          registrationIp: true,
          lastLoginIp: true,
          _count: {
            select: {
              favorites: true,
              activities: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
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

  // 更新用户
  static async updateUser(userId: string, updateData: any, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'update_user',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({
          fields: Object.keys(updateData),
          originalEmail: user.email
        })
      }
    });

    return updatedUser;
  }

  // 封禁用户
  static async banUser(userId: string, banData: BanData) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      throw new ForbiddenError('Cannot ban admin users');
    }

    const banExpires = banData.duration ?
      new Date(Date.now() + banData.duration * 60 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false
      }
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId: banData.bannedBy,
        action: 'ban_user',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({
          reason: banData.reason,
          duration: banData.duration,
          banExpires
        })
      }
    });
  }

  // 解封用户
  static async unbanUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true
      }
    });

    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'unban_user',
        resourceType: 'user',
        resourceId: userId
      }
    });
  }

  // 获取管理员仪表板
  static async getDashboard() {
    const [
      totalUsers,
      activeUsers,
      totalCodes,
      activeCodes,
      expiredCodes,
      pendingReports,
      recentActivity,
      systemHealth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.shiftCode.count(),
      prisma.shiftCode.count({ where: { status: 'active' } }),
      prisma.shiftCode.count({ where: { status: 'expired' } }),
      prisma.codeReport.count({ where: { status: 'pending' } }),
      prisma.userActivity.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.getSystemHealth()
    ]);

    return {
      stats: {
        totalUsers,
        activeUsers,
        totalCodes,
        activeCodes,
        expiredCodes,
        pendingReports,
        recentActivity
      },
      systemHealth
    };
  }

  // 获取系统健康状况
  static async getSystemHealth() {
    try {
      const [dbHealth, redisHealth] = await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        redis.ping()
      ]);

      return {
        database: !!dbHealth,
        redis: redisHealth === 'PONG',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        database: false,
        redis: false,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    }
  }

  // 获取分析数据
  static async getAnalytics(params: AnalyticsParams) {
    const { period, type } = params;

    let startDate: Date;
    switch (period) {
      case '1d':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    if (type === 'users' || type === 'all') {
      const userRegistrations = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      });

      const userActivity = await prisma.userActivity.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      });

      return {
        userRegistrations,
        userActivity
      };
    }

    if (type === 'codes' || type === 'all') {
      const codeActivity = await prisma.codeEvent.groupBy({
        by: ['eventType'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      });

      return {
        codeActivity
      };
    }

    return {};
  }

  // 获取系统配置
  static async getSystemConfig() {
    // 这里可以从数据库或配置文件读取系统配置
    return {
      maintenance: {
        enabled: false,
        message: '',
        allowedRoles: ['admin', 'super_admin']
      },
      features: {
        registration: true,
        codeSubmission: false,
        comments: false,
        favorites: true
      },
      rateLimit: {
        general: 100,
        auth: 5,
        intensive: 10,
        copy: 50
      },
      reddit: {
        enabled: true,
        interval: 30,
        subreddit: 'Borderlands',
        keywords: ['codes', 'shift codes', 'sora2 code']
      }
    };
  }

  // 更新系统配置
  static async updateSystemConfig(configData: any, adminId: string) {
    // 记录管理员操作
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'update_system_config',
        resourceType: 'system',
        metadata: JSON.stringify({
          fields: Object.keys(configData)
        })
      }
    });

    // 这里应该将配置保存到数据库或配置文件
    // 暂时返回更新后的配置
    return configData;
  }

  // 获取缓存统计
  static async getCacheStats() {
    try {
      const info = await redis.info('memory');
      const lines = info.split('\r\n');
      const stats: any = {};

      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        memory: stats.used_memory_human || 'N/A',
        keys: await redis.dbsize(),
        hits: stats.keyspace_hits || 'N/A',
        misses: stats.keyspace_misses || 'N/A'
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        memory: 'N/A',
        keys: 'N/A',
        hits: 'N/A',
        misses: 'N/A'
      };
    }
  }
}