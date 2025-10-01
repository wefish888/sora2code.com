import { prisma } from '../utils/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface CodeFilters {
  platform?: string;
  status?: string;
  search?: string;
  includeExpired?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

interface CopyMetadata {
  userId?: string;
  userAgent?: string;
  ip?: string;
}

interface ReportData {
  userId: string;
  reason: string;
  description?: string;
  email?: string;
}

export class CodesService {
  // 获取代码列表
  static async getCodes(filters: CodeFilters) {
    const {
      platform,
      status,
      search,
      includeExpired = false,
      page,
      limit,
      sortBy,
      sortOrder
    } = filters;

    const offset = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    // 平台筛选
    if (platform && platform !== 'All') {
      where.platforms = {
        some: {
          platform: platform
        }
      };
    }

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
    } else if (!includeExpired) {
      where.OR = [
        { status: 'active' },
        { status: 'pending' }
      ];
    }

    // 搜索
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { rewardDescription: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取所有代码然后在JavaScript中排序 - 优先显示Reddit代码
    const allCodes = await prisma.shiftCode.findMany({
      where,
      include: {
        platforms: true,
        _count: {
          select: {
            copyEvents: true,
            favorites: true,
            reports: true
          }
        }
      }
    });

    const total = allCodes.length;

    // 排序逻辑：按指定字段排序
    const sortedCodes = allCodes.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      if (sortOrder === 'asc') {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      } else {
        if (aValue > bValue) return -1;
        if (aValue < bValue) return 1;
        return 0;
      }
    });

    // 分页
    const codes = sortedCodes.slice(offset, offset + limit);

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

  // 获取全局统计
  static async getGlobalStats() {
    const [
      totalCodes,
      activeCodes,
      expiredCodes,
      totalCopies,
      totalUsers,
      recentCopies
    ] = await Promise.all([
      prisma.shiftCode.count(),
      prisma.shiftCode.count({ where: { status: 'active' } }),
      prisma.shiftCode.count({ where: { status: 'expired' } }),
      prisma.codeEvent.count({ where: { eventType: 'copy' } }),
      prisma.user.count(),
      prisma.codeEvent.count({
        where: {
          eventType: 'copy',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
          }
        }
      })
    ]);

    return {
      totalCodes,
      activeCodes,
      expiredCodes,
      totalCopies,
      totalUsers,
      recentCopies
    };
  }

  // 获取热门代码
  static async getTrendingCodes(limit: number = 10) {
    const codes = await prisma.shiftCode.findMany({
      where: {
        status: 'active'
      },
      include: {
        platforms: true,
        _count: {
          select: {
            copyEvents: true,
            favorites: true
          }
        }
      },
      orderBy: [
        { copyEvents: { _count: 'desc' } },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return codes;
  }

  // 获取单个代码详情
  static async getCodeById(id: string, userId?: string) {
    const code = await prisma.shiftCode.findUnique({
      where: { id },
      include: {
        platforms: true,
        _count: {
          select: {
            copyEvents: true,
            favorites: true,
            reports: true
          }
        }
      }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    let userInfo: any = null;
    if (userId) {
      userInfo = await this.getUserCodeInfo(id, userId) || null;
    }

    return {
      ...code,
      userInfo
    };
  }

  // 获取用户对代码的相关信息
  static async getUserCodeInfo(codeId: string, userId: string) {
    const [favorite, copyEvent] = await Promise.all([
      prisma.favorite.findUnique({
        where: {
          userId_codeId: {
            userId,
            codeId
          }
        }
      }),
      prisma.codeEvent.findFirst({
        where: {
          codeId,
          userId,
          eventType: 'copy'
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      isFavorited: !!favorite,
      lastCopied: copyEvent?.createdAt || null
    };
  }

  // 记录代码复制
  static async recordCopy(codeId: string, metadata: CopyMetadata) {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    // 记录复制事件
    await prisma.codeEvent.create({
      data: {
        codeId,
        userId: metadata.userId,
        eventType: 'copy',
        metadata: JSON.stringify({
          userAgent: metadata.userAgent,
          ip: metadata.ip
        })
      }
    });

    // 更新代码复制计数
    await prisma.shiftCode.update({
      where: { id: codeId },
      data: {
        copyCount: {
          increment: 1
        }
      }
    });

    logger.info('Code copy recorded:', {
      codeId,
      userId: metadata.userId,
      ip: metadata.ip
    });
  }

  // 报告代码问题
  static async reportCode(codeId: string, reportData: ReportData) {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    // 检查用户是否已经报告过这个代码
    const existingReport = await prisma.codeReport.findFirst({
      where: {
        codeId,
        reportedBy: reportData.userId
      }
    });

    if (existingReport) {
      throw new ConflictError('You have already reported this code');
    }

    const report = await prisma.codeReport.create({
      data: {
        codeId,
        reportedBy: reportData.userId,
        reason: reportData.reason,
        description: reportData.description,
        contactEmail: reportData.email
      }
    });

    // 记录报告事件
    await prisma.codeEvent.create({
      data: {
        codeId,
        userId: reportData.userId,
        eventType: 'report',
        metadata: JSON.stringify({
          reason: reportData.reason,
          reportId: report.id
        })
      }
    });

    return report;
  }

  // 切换收藏状态
  static async toggleFavorite(codeId: string, userId: string, action: 'add' | 'remove') {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_codeId: {
          userId,
          codeId
        }
      }
    });

    if (action === 'add') {
      if (existingFavorite) {
        throw new ConflictError('Code is already favorited');
      }

      const favorite = await prisma.favorite.create({
        data: {
          userId,
          codeId
        }
      });

      // 记录收藏事件
      await prisma.codeEvent.create({
        data: {
          codeId,
          userId,
          eventType: 'favorite'
        }
      });

      return { action: 'added', favorite };
    } else {
      if (!existingFavorite) {
        throw new NotFoundError('Code is not favorited');
      }

      await prisma.favorite.delete({
        where: {
          userId_codeId: {
            userId,
            codeId
          }
        }
      });

      // 记录取消收藏事件
      await prisma.codeEvent.create({
        data: {
          codeId,
          userId,
          eventType: 'unfavorite'
        }
      });

      return { action: 'removed' };
    }
  }

  // 获取用户收藏的代码
  static async getUserFavorites(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          shiftCode: {
            include: {
              platforms: true,
              _count: {
                select: {
                  copyEvents: true,
                  favorites: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.favorite.count({ where: { userId } })
    ]);

    return {
      favorites: favorites.map(f => f.shiftCode),
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

  // 搜索代码
  static async searchCodes(params: {
    search: string;
    platform?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { search, platform, status, page, limit } = params;
    const offset = (page - 1) * limit;

    const where: any = {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { rewardDescription: { contains: search, mode: 'insensitive' } }
      ]
    };

    if (platform && platform !== 'All') {
      where.platforms = {
        some: {
          platform: platform
        }
      };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const [codes, total] = await Promise.all([
      prisma.shiftCode.findMany({
        where,
        include: {
          platforms: true,
          _count: {
            select: {
              copyEvents: true,
              favorites: true
            }
          }
        },
        orderBy: [
          { copyEvents: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
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
      },
      query: search
    };
  }

  // 投票功能 - 每次点击都增加计数
  static async voteCode(codeId: string, voteData: {
    userId?: string;
    voteType: 'upvote' | 'downvote';
    ipAddress?: string;
  }) {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    const { userId, voteType, ipAddress } = voteData;

    // 每次点击都创建新的投票记录并增加计数
    await prisma.$transaction(async (tx) => {
      // 创建投票记录
      await tx.codeVote.create({
        data: {
          codeId,
          userId,
          voteType,
          ipAddress
        }
      });

      // 更新计数
      const updateData: any = {};
      if (voteType === 'upvote') {
        updateData.upvoteCount = { increment: 1 };
      } else {
        updateData.downvoteCount = { increment: 1 };
      }

      await tx.shiftCode.update({
        where: { id: codeId },
        data: updateData
      });
    });

    // 获取更新后的代码
    const updatedCode = await prisma.shiftCode.findUnique({
      where: { id: codeId },
      select: {
        upvoteCount: true,
        downvoteCount: true
      }
    });

    return {
      message: `Successfully ${voteType}d`,
      upvoteCount: updatedCode!.upvoteCount,
      downvoteCount: updatedCode!.downvoteCount,
      userVote: voteType
    };
  }

  // 移除投票 (在累加模式下,这个函数不再使用)
  static async removeVote(codeId: string, data: {
    userId?: string;
    ipAddress?: string;
  }) {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    const { userId, ipAddress } = data;

    // 查找最新的投票
    let existingVote: any = null;
    if (userId) {
      existingVote = await prisma.codeVote.findFirst({
        where: {
          codeId,
          userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else if (ipAddress) {
      existingVote = await prisma.codeVote.findFirst({
        where: {
          codeId,
          userId: null,
          ipAddress
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    if (!existingVote) {
      throw new NotFoundError('No vote found to remove');
    }

    // 删除投票并更新计数
    await prisma.$transaction(async (tx) => {
      await tx.codeVote.delete({
        where: { id: existingVote.id }
      });

      const updateData: any = {};
      if (existingVote.voteType === 'upvote') {
        updateData.upvoteCount = { decrement: 1 };
      } else {
        updateData.downvoteCount = { decrement: 1 };
      }

      await tx.shiftCode.update({
        where: { id: codeId },
        data: updateData
      });
    });

    // 获取更新后的代码
    const updatedCode = await prisma.shiftCode.findUnique({
      where: { id: codeId },
      select: {
        upvoteCount: true,
        downvoteCount: true
      }
    });

    return {
      message: 'Vote removed successfully',
      upvoteCount: updatedCode!.upvoteCount,
      downvoteCount: updatedCode!.downvoteCount,
      userVote: null
    };
  }

  // 获取投票状态
  static async getVoteStatus(codeId: string, data: {
    userId?: string;
    ipAddress?: string;
  }) {
    const code = await prisma.shiftCode.findUnique({
      where: { id: codeId },
      select: {
        upvoteCount: true,
        downvoteCount: true
      }
    });

    if (!code) {
      throw new NotFoundError('Code not found');
    }

    const { userId, ipAddress } = data;

    // 查找用户最新的投票
    let userVote: string | null = null;
    if (userId) {
      const vote = await prisma.codeVote.findFirst({
        where: {
          codeId,
          userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      userVote = vote ? vote.voteType : null;
    } else if (ipAddress) {
      const vote = await prisma.codeVote.findFirst({
        where: {
          codeId,
          userId: null,
          ipAddress
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      userVote = vote ? vote.voteType : null;
    }

    return {
      upvoteCount: code.upvoteCount,
      downvoteCount: code.downvoteCount,
      userVote
    };
  }
}