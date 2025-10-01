import { z } from 'zod';

// 用户注册验证
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
});

// 用户登录验证
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

// 刷新令牌验证
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// 忘记密码验证
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

// 重置密码验证
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// 邮箱验证验证
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

// 重新发送验证邮件验证
export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format')
});