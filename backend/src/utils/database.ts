import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// 创建 Prisma 客户端实例
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // 开发环境下复用连接，避免热重载时创建过多连接
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// 连接数据库
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to database');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// 断开数据库连接
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
}

// 健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// 数据库统计信息
export async function getDatabaseStats() {
  try {
    const [
      userCount,
      codeCount,
      activeCodeCount,
      todayInteractions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.shiftCode.count(),
      prisma.shiftCode.count({ where: { status: 'active' } }),
      prisma.codeEvent.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    return {
      users: userCount,
      totalCodes: codeCount,
      activeCodes: activeCodeCount,
      todayInteractions
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
}

export { prisma };
export default prisma;