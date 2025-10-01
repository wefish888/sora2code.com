import { z } from 'zod';

// 管理员创建代码验证
export const createCodeSchema = z.object({
  code: z.string().min(1).max(50),
  rewardDescription: z.string().max(500).optional(),
  platforms: z.array(z.enum(['PC', 'PlayStation', 'Xbox'])).min(1),
  expiresAt: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'expired', 'pending']).optional().default('active')
});

// 管理员更新代码验证
export const updateCodeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  rewardDescription: z.string().max(500).optional(),
  platforms: z.array(z.enum(['PC', 'PlayStation', 'Xbox'])).optional(),
  status: z.enum(['active', 'expired', 'pending']).optional(),
  expiresAt: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional()
});

// 用户管理验证
export const userManagementSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'super_admin']).optional(),
  isPremium: z.boolean().optional(),
  premiumExpiresAt: z.string().datetime().optional(),
  banReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
});

// 系统配置验证
export const systemConfigSchema = z.object({
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().max(500).optional(),
    allowedRoles: z.array(z.string()).optional()
  }).optional(),
  features: z.object({
    registration: z.boolean().optional(),
    codeSubmission: z.boolean().optional(),
    comments: z.boolean().optional(),
    favorites: z.boolean().optional()
  }).optional(),
  rateLimit: z.object({
    general: z.number().positive().optional(),
    auth: z.number().positive().optional(),
    intensive: z.number().positive().optional(),
    copy: z.number().positive().optional()
  }).optional(),
  reddit: z.object({
    enabled: z.boolean().optional(),
    interval: z.number().positive().optional(),
    subreddit: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
});