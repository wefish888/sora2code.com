import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimit, rateLimitMiddleware } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} from '../schemas/auth.schema';

const router = Router();

// 用户注册
router.post(
  '/register',
  authRateLimit,
  validateBody(registerSchema),
  asyncHandler(AuthController.register)
);

// 用户登录
router.post(
  '/login',
  authRateLimit,
  validateBody(loginSchema),
  asyncHandler(AuthController.login)
);

// 刷新访问令牌
router.post(
  '/refresh',
  rateLimitMiddleware,
  validateBody(refreshTokenSchema),
  asyncHandler(AuthController.refreshToken)
);

// 用户登出
router.post(
  '/logout',
  rateLimitMiddleware,
  asyncHandler(AuthController.logout)
);

// 忘记密码
router.post(
  '/forgot-password',
  authRateLimit,
  validateBody(forgotPasswordSchema),
  asyncHandler(AuthController.forgotPassword)
);

// 重置密码
router.post(
  '/reset-password',
  authRateLimit,
  validateBody(resetPasswordSchema),
  asyncHandler(AuthController.resetPassword)
);

// 验证邮箱
router.post(
  '/verify-email',
  authRateLimit,
  validateBody(verifyEmailSchema),
  asyncHandler(AuthController.verifyEmail)
);

// 重新发送验证邮件
router.post(
  '/resend-verification',
  authRateLimit,
  validateBody(resendVerificationSchema),
  asyncHandler(AuthController.resendVerification)
);

// Google OAuth 登录
router.get(
  '/google',
  asyncHandler(AuthController.googleLogin)
);

// Google OAuth 回调
router.get(
  '/google/callback',
  asyncHandler(AuthController.googleCallback)
);

export { router as authRouter };