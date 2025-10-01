import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/database';
import { JWTManager } from '../middleware/auth';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';

interface RegisterData {
  email: string;
  password: string;
  username: string;
  acceptTerms: boolean;
  ip?: string;
  userAgent?: string;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
  ip?: string;
  userAgent?: string;
}

interface GoogleCallbackData {
  code: string;
  state?: string;
  ip?: string;
  userAgent?: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isVerified: boolean;
    isPremium: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  // 用户注册
  static async register(data: RegisterData) {
    const { email, password, username, ip, userAgent } = data;

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findFirst({
      where: { username }
    });

    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 生成邮箱验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        verificationToken,
        registrationIp: ip,
        lastLoginIp: ip
      }
    });

    // 记录注册事件
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'register',
        metadata: JSON.stringify({
          ip,
          userAgent
        })
      }
    });

    // 发送验证邮件
    await EmailService.sendVerificationEmail(email, verificationToken);

    // 生成JWT令牌
    const tokens = JWTManager.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium
      },
      tokens,
      requiresVerification: true
    };
  }

  // 用户登录
  static async login(data: LoginData): Promise<AuthResult> {
    const { email, password, rememberMe, ip, userAgent } = data;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 检查账户状态
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 更新最后登录信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip
      }
    });

    // 记录登录事件
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'login',
        metadata: JSON.stringify({
          ip,
          userAgent,
          rememberMe
        })
      }
    });

    // 生成JWT令牌
    const tokens = JWTManager.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username || '',
        role: user.role,
        isVerified: user.isVerified,
        isPremium: user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())
      },
      tokens
    };
  }

  // 刷新令牌
  static async refreshToken(refreshToken: string) {
    try {
      const payload = JWTManager.verifyRefreshToken(refreshToken);

      // 检查用户是否仍然有效
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or disabled');
      }

      // 生成新的访问令牌
      const newAccessToken = JWTManager.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
          isPremium: user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())
        }
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  // 忘记密码
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // 即使用户不存在也返回成功，防止邮箱枚举攻击
      return;
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1小时后过期

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // 记录密码重置请求
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'password_reset_request'
      }
    });

    // 发送重置邮件
    await EmailService.sendPasswordResetEmail(email, resetToken);
  }

  // 重置密码
  static async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码并清除重置令牌
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    // 记录密码重置完成
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'password_reset_complete'
      }
    });

    logger.info('Password reset completed:', { userId: user.id });
  }

  // 验证邮箱
  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new ValidationError('Invalid verification token');
    }

    if (user.isVerified) {
      throw new ValidationError('Email is already verified');
    }

    // 更新验证状态
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        emailVerifiedAt: new Date()
      }
    });

    // 记录邮箱验证
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'email_verified'
      }
    });

    return {
      userId: user.id,
      email: user.email,
      username: user.username
    };
  }

  // 重新发送验证邮件
  static async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isVerified) {
      throw new ValidationError('Email is already verified');
    }

    // 生成新的验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });

    // 记录重新发送验证邮件
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'verification_resent'
      }
    });

    // 发送验证邮件
    await EmailService.sendVerificationEmail(email, verificationToken);
  }

  // Google OAuth URL生成
  static getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri!,
      response_type: 'code',
      scope: 'openid email profile',
      state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Google OAuth 回调处理
  static async handleGoogleCallback(data: GoogleCallbackData): Promise<AuthResult> {
    // 这里需要实现Google OAuth的token交换和用户信息获取
    // 由于需要Google OAuth库，这里提供基本结构

    // 1. 使用code换取access_token
    // 2. 使用access_token获取用户信息
    // 3. 查找或创建用户
    // 4. 生成JWT令牌

    // 临时实现，实际需要Google OAuth库
    throw new Error(`Google OAuth not implemented yet. Received data: ${JSON.stringify(data)}`);
  }
}