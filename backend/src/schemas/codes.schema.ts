import { z } from 'zod';

// 代码查询参数验证
export const codesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  platform: z.enum(['PC', 'PlayStation', 'Xbox', 'All']).optional(),
  status: z.enum(['active', 'expired', 'pending', 'all']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'copyCount', 'popularity']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeExpired: z.string().optional().transform(val => val === 'true')
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: "Page must be >= 1 and limit must be between 1 and 100"
});

// 报告代码问题验证
export const reportCodeSchema = z.object({
  reason: z.enum([
    'expired',
    'invalid',
    'duplicate',
    'inappropriate',
    'spam',
    'other'
  ]),
  description: z.string().min(10).max(500).optional(),
  email: z.string().email().optional()
});

// 收藏代码验证
export const favoriteCodeSchema = z.object({
  action: z.enum(['add', 'remove'])
});

// 代码创建验证（管理员用）
export const createCodeSchema = z.object({
  code: z.string().min(1).max(50),
  rewardDescription: z.string().max(500).optional(),
  platforms: z.array(z.enum(['PC', 'PlayStation', 'Xbox'])).min(1),
  expiresAt: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  notes: z.string().max(1000).optional()
});

// 代码更新验证（管理员用）
export const updateCodeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  rewardDescription: z.string().max(500).optional(),
  platforms: z.array(z.enum(['PC', 'PlayStation', 'Xbox'])).optional(),
  status: z.enum(['active', 'expired', 'pending']).optional(),
  expiresAt: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional()
});