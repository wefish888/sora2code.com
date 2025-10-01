import axios, { AxiosInstance } from 'axios';
import { prisma } from '../utils/database';
import { CacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  created_utc: number;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
}


interface ExtractedCode {
  code: string;
  description?: string;
  platforms: string[];
}

interface MonitorStatus {
  isRunning: boolean;
  lastCheck: Date | null;
  totalChecks: number;
  codesFound: number;
  errors: number;
  lastError?: string;
}

export class RedditService {
  private static instance: RedditService;
  private httpClient: AxiosInstance;
  private monitorInterval: NodeJS.Timeout | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private status: MonitorStatus = {
    isRunning: false,
    lastCheck: null,
    totalChecks: 0,
    codesFound: 0,
    errors: 0
  };

  constructor() {
    const userAgent = process.env.REDDIT_USER_AGENT || 'sora2code/1.0.0';

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': userAgent
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
  }


  static getInstance(): RedditService {
    if (!this.instance) {
      this.instance = new RedditService();
    }
    return this.instance;
  }

  /**
   * 获取 Reddit OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // 如果 token 还有效，直接返回
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('Reddit credentials not configured');
    }

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        `grant_type=password&username=${username}&password=${password}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': process.env.REDDIT_USER_AGENT || 'sora2code/1.0.0'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 提前1分钟过期

      logger.info('Reddit OAuth token obtained successfully');
      return this.accessToken!;
    } catch (error) {
      logger.error('Failed to get Reddit access token:', error);
      throw new Error('Failed to authenticate with Reddit');
    }
  }

  // 启动监控
  static async startMonitoring(): Promise<void> {
    const service = this.getInstance();
    await service.startMonitor();
  }

  // 停止监控
  static async stopMonitoring(): Promise<void> {
    const service = this.getInstance();
    service.stopMonitor();
  }

  // 获取监控状态
  static getMonitorStatus(): MonitorStatus {
    const service = this.getInstance();
    return { ...service.status };
  }

  // 重启监控
  static async restartMonitor(): Promise<void> {
    const service = this.getInstance();
    service.stopMonitor();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    await service.startMonitor();
  }

  // 获取日志
  static async getLogs(options: {
    page: number;
    limit: number;
    level?: string;
  }): Promise<any> {
    const { page, limit, level } = options;
    const offset = (page - 1) * limit;

    const where: any = {
      source: 'reddit_monitor'
    };

    if (level) {
      where.level = level;
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.systemLog.count({ where })
    ]);

    return {
      logs,
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

  // 启动监控
  private async startMonitor(): Promise<void> {
    if (this.status.isRunning) {
      logger.warn('Reddit monitor is already running');
      return;
    }

    this.status.isRunning = true;
    logger.info('Starting Reddit monitor...');

    // 立即执行一次检查
    await this.checkForNewCodes();

    // 设置定时检查（默认30秒）
    const interval = parseInt(process.env.REDDIT_CHECK_INTERVAL || '30') * 1000;
    this.monitorInterval = setInterval(async () => {
      await this.checkForNewCodes();
    }, interval);

    logger.info(`Reddit monitor started with ${interval / 1000}s interval`);
  }

  // 停止监控
  private stopMonitor(): void {
    if (!this.status.isRunning) {
      logger.warn('Reddit monitor is not running');
      return;
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.status.isRunning = false;
    logger.info('Reddit monitor stopped');
  }

  // 检查新代码
  private async checkForNewCodes(): Promise<void> {
    try {
      this.status.totalChecks++;
      this.status.lastCheck = new Date();

      logger.info('Checking Reddit for new codes...');

      // 搜索相关帖子
      const posts = await this.searchRedditPosts();
      let newCodesCount = 0;

      for (const post of posts) {
        // 检查是否已处理过这个帖子
        const processedKey = CacheKeys.redditProcessed(post.id);
        const isProcessed = await CacheService.exists(processedKey);

        if (isProcessed) {
          continue;
        }

        // 提取代码
        const extractedCodes = this.extractCodesFromPost(post);

        if (extractedCodes.length > 0) {
          // 保存代码到数据库
          const savedCodes = await this.saveExtractedCodes(extractedCodes, post);
          newCodesCount += savedCodes.length;

          // 标记帖子为已处理
          await CacheService.set(processedKey, '1', 7 * 24 * 3600); // 缓存7天

          // 发送通知邮件给订阅用户
          if (savedCodes.length > 0) {
            await this.notifySubscribers(savedCodes);
          }
        } else {
          // 即使没有找到代码也标记为已处理，避免重复检查
          await CacheService.set(processedKey, '1', 24 * 3600); // 缓存24小时
        }
      }

      this.status.codesFound += newCodesCount;

      if (newCodesCount > 0) {
        logger.info(`Found ${newCodesCount} new codes from Reddit`);
      }

      // 记录系统日志
      await this.logMonitorActivity('info', 'Check completed', {
        postsChecked: posts.length,
        newCodes: newCodesCount
      });

    } catch (error) {
      this.status.errors++;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error checking Reddit for codes:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 记录错误日志
      await this.logMonitorActivity('error', 'Check failed', {
        error: this.status.lastError
      });
    }
  }

  // 搜索Reddit帖子
  private async searchRedditPosts(): Promise<RedditPost[]> {
    const subreddit = process.env.REDDIT_SUBREDDIT || 'OpenAI';

    try {
      // 获取 OAuth token
      const accessToken = await this.getAccessToken();

      // 使用 OAuth API
      const response = await axios.get(
        `https://oauth.reddit.com/r/${subreddit}/new`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': process.env.REDDIT_USER_AGENT || 'sora2code/1.0.0'
          },
          params: {
            limit: 100,
            raw_json: 1
          },
          timeout: 30000
        }
      );

      if (response.status !== 200) {
        logger.warn(`Reddit API returned status ${response.status}`);
        return [];
      }

      const data = response.data;

      // 验证数据结构
      if (!data || !data.data || !Array.isArray(data.data.children)) {
        logger.error('Invalid response structure from Reddit API');
        return [];
      }

      const posts = data.data.children.map((child: any) => child.data);

      // 过滤包含代码关键词的帖子
      const filteredPosts = posts.filter((post: any) => {
        const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
        return text.includes('sora') &&
               (text.includes('invite') ||
                text.includes('code') ||
                text.includes('access') ||
                text.includes('key'));
      });

      logger.info(`Successfully fetched from Reddit: ${filteredPosts.length} relevant posts out of ${posts.length} total`);

      return filteredPosts;

    } catch (error) {
      logger.error('Failed to fetch from Reddit:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.response?.status
      });
      return [];
    }
  }

  // 从帖子中提取代码
  private extractCodesFromPost(post: RedditPost): ExtractedCode[] {
    const text = `${post.title} ${post.selftext}`;
    const codes: ExtractedCode[] = [];

    // Sora invite codes 通常是6位大写字母数字组合
    // 例如: E9QPCR, 0N79AW, FGPEB8
    const codePattern = /\b([A-Z0-9]{6})\b/g;
    const matches = text.match(codePattern);

    if (matches) {
      for (const match of matches) {
        const code = match.toUpperCase();

        // 过滤明显不是邀请码的字符串（例如纯数字、纯字母等常见词）
        if (this.isLikelyInviteCode(code, text)) {
          // Sora是全平台通用的
          const platforms = ['All'];

          // 提取描述
          const description = this.extractRewardDescription(text, code);

          codes.push({
            code,
            description,
            platforms
          });
        }
      }
    }

    return codes;
  }

  // 判断是否可能是邀请码
  private isLikelyInviteCode(code: string, context: string): boolean {
    // 排除常见的6位英文单词或无意义字符串
    const commonWords = ['THANKS', 'PLEASE', 'INVITE', 'ACCESS', 'UPDATE', 'REDDIT', 'OPENAI'];
    if (commonWords.includes(code)) {
      return false;
    }

    // 必须包含数字和字母的混合
    const hasNumber = /\d/.test(code);
    const hasLetter = /[A-Z]/.test(code);

    // 检查上下文是否提到invite/code
    const lowerContext = context.toLowerCase();
    const hasInviteContext = lowerContext.includes('invite') ||
                            lowerContext.includes('code') ||
                            lowerContext.includes('access');

    return (hasNumber && hasLetter) || hasInviteContext;
  }

  // 检测平台
  private detectPlatforms(text: string, code: string): string[] {
    const platforms: string[] = [];
    const lowerText = text.toLowerCase();

    // 查找代码附近的平台关键词
    const codeIndex = lowerText.indexOf(code.toLowerCase());
    const contextStart = Math.max(0, codeIndex - 100);
    const contextEnd = Math.min(text.length, codeIndex + code.length + 100);
    const context = lowerText.slice(contextStart, contextEnd);

    if (context.includes('pc') || context.includes('steam') || context.includes('epic')) {
      platforms.push('PC');
    }
    if (context.includes('xbox') || context.includes('microsoft')) {
      platforms.push('Xbox');
    }
    if (context.includes('playstation') || context.includes('ps4') || context.includes('ps5') || context.includes('sony')) {
      platforms.push('PlayStation');
    }

    // 如果没有找到特定平台，默认为所有平台
    if (platforms.length === 0) {
      platforms.push('PC', 'Xbox', 'PlayStation');
    }

    return platforms;
  }

  // 提取奖励描述
  private extractRewardDescription(text: string, code: string): string | undefined {
    const codeIndex = text.toLowerCase().indexOf(code.toLowerCase());
    if (codeIndex === -1) return 'Sora2 Access';

    // 在代码前后查找描述关键词
    const contextStart = Math.max(0, codeIndex - 200);
    const contextEnd = Math.min(text.length, codeIndex + code.length + 200);
    const context = text.slice(contextStart, contextEnd);

    // 常见描述关键词
    const rewardPatterns = [
      /Sora2 Access/i,
      /video generation/i,
      /invite code/i,
      /early access/i,
      /beta access/i,
      /full access/i
    ];

    for (const pattern of rewardPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Sora2 Access';
  }

  // 保存提取的代码
  private async saveExtractedCodes(codes: ExtractedCode[], post: RedditPost): Promise<any[]> {
    const savedCodes: any[] = [];

    for (const extractedCode of codes) {
      try {
        // 检查代码是否已存在
        const existingCode = await prisma.shiftCode.findUnique({
          where: { code: extractedCode.code }
        });

        if (existingCode) {
          logger.info(`Code ${extractedCode.code} already exists, skipping`);
          continue;
        }

        // 创建新代码
        const newCode = await prisma.$transaction(async (tx) => {
          const code = await tx.shiftCode.create({
            data: {
              code: extractedCode.code,
              rewardDescription: extractedCode.description,
              status: 'active',
              sourceUrl: `https://reddit.com${post.permalink}`,
              sourceId: post.id,
              sourceType: 'reddit',
              notes: `Auto-imported from Reddit r/${process.env.REDDIT_SUBREDDIT || 'OpenAI'} - sora2 invite code`
            }
          });

          // 创建平台关联
          const platformData = extractedCode.platforms.map(platform => ({
            codeId: code.id,
            platform
          }));

          await tx.codePlatform.createMany({
            data: platformData
          });

          return code;
        });

        savedCodes.push(newCode);

        logger.info(`Saved new code: ${extractedCode.code}`);

      } catch (error) {
        logger.error(`Failed to save code ${extractedCode.code}:`, error);
      }
    }

    return savedCodes;
  }

  // 通知订阅用户
  private async notifySubscribers(codes: any[]): Promise<void> {
    try {
      // 获取启用了邮件通知的用户
      const subscribedUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          isVerified: true
        },
        select: {
          email: true,
          username: true
        }
      });

      // 批量发送通知邮件
      const emailPromises = subscribedUsers.map(user =>
        EmailService.sendNewCodeNotification(user.email, codes)
      );

      await Promise.allSettled(emailPromises);

      logger.info(`Sent new code notifications to ${subscribedUsers.length} users`);

    } catch (error) {
      logger.error('Failed to notify subscribers:', error);
    }
  }

  // 记录监控活动
  private async logMonitorActivity(level: string, message: string, metadata?: any): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          level,
          message,
          source: 'reddit_monitor',
          metadata: metadata ? JSON.stringify(metadata) : undefined
        }
      });
    } catch (error) {
      logger.error('Failed to log monitor activity:', error);
    }
  }
}