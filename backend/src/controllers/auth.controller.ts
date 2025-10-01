import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { JWTManager } from '../middleware/auth';
import { logger } from '../utils/logger';
import { CacheService, CacheKeys } from '../utils/redis';

export class AuthController {
  // 用户注册
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, username, acceptTerms } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.register({
      email,
      password,
      username,
      acceptTerms,
      ip,
      userAgent
    });

    logger.info('User registered:', {
      userId: result.user.id,
      email,
      ip
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful. Please check your email for verification.'
    });
  }

  // 用户登录
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password, rememberMe } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.login({
      email,
      password,
      rememberMe,
      ip,
      userAgent
    });

    logger.info('User logged in:', {
      userId: result.user.id,
      email,
      ip
    });

    res.json({
      success: true,
      data: result
    });
  }

  // 刷新访问令牌
  static async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  }

  // 用户登出
  static async logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await JWTManager.blacklistToken(token);

      // 清除用户缓存
      const payload = JWTManager.verifyAccessToken(token);
      await CacheService.del(CacheKeys.userProfile(payload.userId));
    }

    logger.info('User logged out:', {
      userId: (req as any).user?.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  // 忘记密码
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    await AuthService.forgotPassword(email);

    logger.info('Password reset requested:', { email });

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });
  }

  // 重置密码
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    await AuthService.resetPassword(token, password);

    logger.info('Password reset completed');

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  }

  // 验证邮箱
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    const result = await AuthService.verifyEmail(token);

    logger.info('Email verified:', {
      userId: result.userId,
      email: result.email
    });

    res.json({
      success: true,
      data: result,
      message: 'Email verified successfully'
    });
  }

  // 重新发送验证邮件
  static async resendVerification(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    await AuthService.resendVerification(email);

    logger.info('Verification email resent:', { email });

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  }

  // Google OAuth 登录
  static async googleLogin(req: Request, res: Response): Promise<void> {
    const authUrl = AuthService.getGoogleAuthUrl();

    res.json({
      success: true,
      data: {
        authUrl
      }
    });
  }

  // Google OAuth 回调
  static async googleCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query as any;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.handleGoogleCallback({
      code,
      state,
      ip,
      userAgent
    });

    logger.info('Google OAuth login:', {
      userId: result.user.id,
      email: result.user.email,
      ip
    });

    // 重定向到前端并携带token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${result.tokens.accessToken}&refresh=${result.tokens.refreshToken}`;
    res.redirect(redirectUrl);
  }
}