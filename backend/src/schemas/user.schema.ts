import { z } from 'zod';

// 更新用户资料验证
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    defaultPlatform: z.enum(['PC', 'PlayStation', 'Xbox']).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.enum(['en', 'zh', 'es', 'fr', 'de']).optional()
  }).optional()
});

// 修改密码验证
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number')
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
});