import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  // 初始化邮件服务
  static initialize() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);

    // 验证配置
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('SMTP configuration error:', error);
      } else {
        logger.info('SMTP server is ready to send emails');
      }
    });
  }

  // 发送验证邮件
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

    const mailOptions = {
      from: `"sora2 code" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email - sora2 code',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">sora2 code</h1>
            <p style="color: white; margin: 5px 0;">Your Ultimate sora2 Shift Codes Hub</p>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to sora2 code!</h2>

            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              Thank you for joining our community! To get started and access all features,
              please verify your email address by clicking the button below.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background: #667eea; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #777; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea;">${verificationUrl}</a>
            </p>

            <p style="color: #777; font-size: 14px; margin-top: 20px;">
              This verification link will expire in 24 hours for security purposes.
            </p>
          </div>

          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>© 2024 sora2 code. All rights reserved.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent:', { email });
    } catch (error) {
      logger.error('Failed to send verification email:', { email, error });
      throw error;
    }
  }

  // 发送密码重置邮件
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"sora2 code" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password - sora2 code',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">sora2 code</h1>
            <p style="color: white; margin: 5px 0;">Password Reset Request</p>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>

            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password. If you made this request,
              click the button below to choose a new password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background: #dc3545; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="color: #777; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #dc3545;">${resetUrl}</a>
            </p>

            <p style="color: #777; font-size: 14px; margin-top: 20px;">
              This reset link will expire in 1 hour for security purposes.
            </p>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-top: 25px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Notice:</strong> If you didn't request this password reset,
                please ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </div>

          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>© 2024 sora2 code. All rights reserved.</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent:', { email });
    } catch (error) {
      logger.error('Failed to send password reset email:', { email, error });
      throw error;
    }
  }

  // 发送欢迎邮件（邮箱验证后）
  static async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const mailOptions = {
      from: `"sora2 code" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to sora2 code!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to sora2 code!</h1>
            <p style="color: white; margin: 5px 0;">Your account is now active</p>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}!</h2>

            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              Your email has been successfully verified and your account is now active.
              You can now access all features of sora2 code!
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
              <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Browse the latest sora2 shift codes</li>
                <li>Save your favorite codes for quick access</li>
                <li>Get notifications for new codes</li>
                <li>Join our community discussions</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}"
                 style="background: #28a745; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Start Exploring
              </a>
            </div>
          </div>

          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>© 2024 sora2 code. All rights reserved.</p>
            <p>Follow us for the latest updates and codes!</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent:', { email, username });
    } catch (error) {
      logger.error('Failed to send welcome email:', { email, error });
      // Don't throw error for welcome email failures
    }
  }

  // 发送新代码通知邮件
  static async sendNewCodeNotification(email: string, codes: any[]): Promise<void> {
    const codesHtml = codes.map(code => `
      <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <div style="font-weight: bold; color: #333; font-size: 16px;">${code.code}</div>
        <div style="color: #666; margin: 5px 0;">${code.rewardDescription || 'Borderlands reward'}</div>
        <div style="font-size: 12px; color: #999;">
          Platforms: ${code.platforms.map((p: any) => p.platform).join(', ')}
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: `"sora2 code" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `New sora2 Shift Codes Available!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Codes Available!</h1>
            <p style="color: white; margin: 5px 0;">${codes.length} fresh shift code${codes.length > 1 ? 's' : ''} for you</p>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              We've found ${codes.length} new sora2 shift code${codes.length > 1 ? 's' : ''} that you might be interested in:
            </p>

            ${codesHtml}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}"
                 style="background: #667eea; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                View All Codes
              </a>
            </div>
          </div>

          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>© 2024 sora2 code. All rights reserved.</p>
            <p>
              <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #6c757d;">
                Unsubscribe from notifications
              </a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('New code notification sent:', { email, codeCount: codes.length });
    } catch (error) {
      logger.error('Failed to send new code notification:', { email, error });
      // Don't throw error for notification failures
    }
  }
}