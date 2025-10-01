import axios, { AxiosInstance } from 'axios';
import { prisma } from '../utils/database';
import { CacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
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

export class TwitterService {
  private static instance: TwitterService;
  private httpClient: AxiosInstance;
  private monitorInterval: NodeJS.Timeout | null = null;
  private status: MonitorStatus = {
    isRunning: false,
    lastCheck: null,
    totalChecks: 0,
    codesFound: 0,
    errors: 0
  };

  constructor() {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN || '';

    this.httpClient = axios.create({
      baseURL: 'https://api.twitter.com/2',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  static getInstance(): TwitterService {
    if (!this.instance) {
      this.instance = new TwitterService();
    }
    return this.instance;
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    await service.startMonitor();
  }

  // 启动监控
  private async startMonitor(): Promise<void> {
    if (this.status.isRunning) {
      logger.warn('Twitter monitor is already running');
      return;
    }

    this.status.isRunning = true;
    logger.info('Starting Twitter monitor...');

    // 立即执行一次检查
    await this.checkForNewCodes();

    // 设置定时检查（默认30秒）
    const interval = parseInt(process.env.TWITTER_CHECK_INTERVAL || '30') * 1000;
    this.monitorInterval = setInterval(async () => {
      await this.checkForNewCodes();
    }, interval);

    logger.info(`Twitter monitor started with ${interval / 1000}s interval`);
  }

  // 停止监控
  private stopMonitor(): void {
    if (!this.status.isRunning) {
      logger.warn('Twitter monitor is not running');
      return;
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.status.isRunning = false;
    logger.info('Twitter monitor stopped');
  }

  // 检查新代码
  private async checkForNewCodes(): Promise<void> {
    try {
      this.status.totalChecks++;
      this.status.lastCheck = new Date();

      logger.info('Checking Twitter for new codes...');

      // 搜索相关推文
      const tweets = await this.searchTweets();
      let newCodesCount = 0;

      for (const tweet of tweets) {
        // 检查是否已处理过这条推文
        const processedKey = CacheKeys.twitterProcessed(tweet.id);
        const isProcessed = await CacheService.exists(processedKey);

        if (isProcessed) {
          continue;
        }

        // 提取代码
        const extractedCodes = this.extractCodesFromTweet(tweet);

        if (extractedCodes.length > 0) {
          // 保存代码到数据库
          const savedCodes = await this.saveExtractedCodes(extractedCodes, tweet);
          newCodesCount += savedCodes.length;

          // 标记推文为已处理
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
        logger.info(`Found ${newCodesCount} new codes from Twitter`);
      }

      // 记录系统日志
      await this.logMonitorActivity('info', 'Check completed', {
        tweetsChecked: tweets.length,
        newCodes: newCodesCount
      });

    } catch (error) {
      this.status.errors++;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error checking Twitter for codes:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 记录错误日志
      await this.logMonitorActivity('error', 'Check failed', {
        error: this.status.lastError
      });
    }
  }

  // 搜索Twitter推文
  private async searchTweets(): Promise<Tweet[]> {
    try {
      const query = process.env.TWITTER_SEARCH_QUERY || 'sora2 invite code OR sora2 invite';

      const response = await this.httpClient.get('/tweets/search/recent', {
        params: {
          query: query,
          max_results: 50,
          'tweet.fields': 'created_at,public_metrics,author_id',
          expansions: 'author_id'
        }
      });

      if (!response.data || !response.data.data) {
        logger.warn('No tweets found in Twitter API response');
        return [];
      }

      const tweets: Tweet[] = response.data.data;
      logger.info(`Successfully fetched ${tweets.length} tweets from Twitter`);

      return tweets;

    } catch (error) {
      logger.error('Failed to fetch from Twitter API:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.response?.status
      });

      return [];
    }
  }

  // 从推文中提取代码
  private extractCodesFromTweet(tweet: Tweet): ExtractedCode[] {
    const text = tweet.text;
    const codes: ExtractedCode[] = [];

    // Sora invite codes 通常是6位大写字母数字组合
    const codePattern = /\b([A-Z0-9]{6})\b/g;
    const matches = text.match(codePattern);

    if (matches) {
      for (const match of matches) {
        const code = match.toUpperCase();

        // 过滤明显不是邀请码的字符串
        if (this.isLikelyInviteCode(code, text)) {
          const platforms = ['All'];
          const description = this.extractDescription(text, code);

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
    // 排除常见的6位英文单词
    const commonWords = ['THANKS', 'PLEASE', 'INVITE', 'ACCESS', 'UPDATE', 'TWITTER', 'OPENAI'];
    if (commonWords.includes(code)) {
      return false;
    }

    // 必须包含数字和字母的混合
    const hasNumber = /\d/.test(code);
    const hasLetter = /[A-Z]/.test(code);

    // 检查上下文
    const lowerContext = context.toLowerCase();
    const hasInviteContext = lowerContext.includes('invite') ||
                            lowerContext.includes('code') ||
                            lowerContext.includes('access') ||
                            lowerContext.includes('sora');

    return (hasNumber && hasLetter) && hasInviteContext;
  }

  // 提取描述
  private extractDescription(text: string, code: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('Sora2 Access')) return 'Sora2 Access';
    if (lowerText.includes('video generation')) return 'Video Generation';
    if (lowerText.includes('early access')) return 'Early Access';
    if (lowerText.includes('beta access')) return 'Beta Access';
    if (lowerText.includes('full access')) return 'Full Access';

    return 'Sora2 Access';
  }

  // 保存提取的代码
  private async saveExtractedCodes(codes: ExtractedCode[], tweet: Tweet): Promise<any[]> {
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
              sourceUrl: `https://twitter.com/i/web/status/${tweet.id}`,
              sourceId: tweet.id,
              sourceType: 'twitter',
              notes: `Auto-imported from Twitter`
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

        logger.info(`Saved new code from Twitter: ${extractedCode.code}`);

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
          source: 'twitter_monitor',
          metadata: metadata ? JSON.stringify(metadata) : undefined
        }
      });
    } catch (error) {
      logger.error('Failed to log monitor activity:', error);
    }
  }
}
