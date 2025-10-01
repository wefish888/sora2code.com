import axios, { AxiosInstance } from 'axios';
import { prisma } from '../utils/database';
import { CacheService, CacheKeys } from '../utils/redis';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

interface ExtractedCode {
  code: string;
  description?: string;
  platforms: string[];
  source: string;
  sourceUrl?: string;
}

interface MonitorStatus {
  isRunning: boolean;
  lastCheck: Date | null;
  totalChecks: number;
  codesFound: number;
  errors: number;
  lastError?: string;
}

export class ClaudeService {
  private static instance: ClaudeService;
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
    const apiKey = process.env.ANTHROPIC_API_KEY || '';

    this.httpClient = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
  }

  static getInstance(): ClaudeService {
    if (!this.instance) {
      this.instance = new ClaudeService();
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
      logger.warn('Claude monitor is already running');
      return;
    }

    this.status.isRunning = true;
    logger.info('Starting Claude monitor...');

    // 立即执行一次检查
    await this.checkForNewCodes();

    // 设置定时检查（默认10分钟）
    const interval = parseInt(process.env.CLAUDE_CHECK_INTERVAL || '600') * 1000;
    this.monitorInterval = setInterval(async () => {
      await this.checkForNewCodes();
    }, interval);

    logger.info(`Claude monitor started with ${interval / 1000}s interval`);
  }

  // 停止监控
  private stopMonitor(): void {
    if (!this.status.isRunning) {
      logger.warn('Claude monitor is not running');
      return;
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.status.isRunning = false;
    logger.info('Claude monitor stopped');
  }

  // 检查新代码
  private async checkForNewCodes(): Promise<void> {
    try {
      this.status.totalChecks++;
      this.status.lastCheck = new Date();

      logger.info('Checking for new Sora invite codes using Claude...');

      // 使用 Claude 进行网络搜索和代码提取
      const extractedCodes = await this.searchAndExtractCodes();
      let newCodesCount = 0;

      if (extractedCodes.length > 0) {
        // 保存代码到数据库
        const savedCodes = await this.saveExtractedCodes(extractedCodes);
        newCodesCount = savedCodes.length;

        // 发送通知邮件给订阅用户
        if (savedCodes.length > 0) {
          await this.notifySubscribers(savedCodes);
        }
      }

      this.status.codesFound += newCodesCount;

      if (newCodesCount > 0) {
        logger.info(`Found ${newCodesCount} new codes using Claude`);
      }

      // 记录系统日志
      await this.logMonitorActivity('info', 'Check completed', {
        newCodes: newCodesCount
      });

    } catch (error) {
      this.status.errors++;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error checking for codes with Claude:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 记录错误日志
      await this.logMonitorActivity('error', 'Check failed', {
        error: this.status.lastError
      });
    }
  }

  // 使用 Claude 搜索并提取代码
  private async searchAndExtractCodes(): Promise<ExtractedCode[]> {
    try {
      const prompt = `Search the latest information on the web for Sora (OpenAI's video generation AI) invite codes.

Please find the most recent Sora invite codes shared online. Sora invite codes are typically 6-character alphanumeric codes (e.g., E9QPCR, 0N79AW, FGPEB8).

Search for:
- Reddit posts in r/OpenAI or other relevant subreddits
- Twitter/X posts mentioning "Sora invite code", "Sora access code", or "OpenAI Sora invite"
- Forum discussions about Sora access
- Blog posts or articles sharing Sora invite codes

For each code you find, provide:
1. The code itself (6 characters, alphanumeric)
2. The source (e.g., "Reddit r/OpenAI", "Twitter", "Forum")
3. A brief description or context
4. The source URL if available

Format your response as a JSON array:
[
  {
    "code": "ABC123",
    "description": "Sora Access - Full video generation",
    "source": "Reddit r/OpenAI",
    "sourceUrl": "https://reddit.com/..."
  }
]

Only include codes that:
- Are 6 characters long (letters and numbers)
- Are mentioned in context of Sora/OpenAI
- Appear to be legitimate invite codes (not common words like THANKS, PLEASE)
- Are recent (posted within the last few days)

If no new codes are found, return an empty array [].`;

      const response = await this.httpClient.post('/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // 解析 Claude 的响应
      const content = response.data.content[0].text;
      logger.info('Claude response received:', { content });

      // 提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('No JSON array found in Claude response');
        return [];
      }

      const codes: ExtractedCode[] = JSON.parse(jsonMatch[0]);

      // 验证和标准化代码
      const validatedCodes = codes
        .filter(item => this.isValidInviteCode(item.code))
        .map(item => ({
          code: item.code.toUpperCase(),
          description: item.description || 'Sora2 Access',
          platforms: ['All'], // Sora is web-based, platform-agnostic
          source: item.source || 'Web Search',
          sourceUrl: item.sourceUrl
        }));

      logger.info(`Extracted ${validatedCodes.length} valid codes from Claude response`);
      return validatedCodes;

    } catch (error) {
      logger.error('Failed to search and extract codes with Claude:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data
      });
      return [];
    }
  }

  // 验证邀请码格式
  private isValidInviteCode(code: string): boolean {
    // 必须是6位字符
    if (code.length !== 6) return false;

    // 必须只包含字母和数字
    if (!/^[A-Z0-9]{6}$/i.test(code)) return false;

    // 排除常见的6位英文单词
    const commonWords = ['THANKS', 'PLEASE', 'INVITE', 'ACCESS', 'UPDATE', 'REDDIT', 'OPENAI', 'REMOVE', 'DELETE', 'SEARCH'];
    if (commonWords.includes(code.toUpperCase())) return false;

    // 必须包含数字和字母的混合（至少各一个）
    const hasNumber = /\d/.test(code);
    const hasLetter = /[A-Z]/i.test(code);

    return hasNumber && hasLetter;
  }

  // 保存提取的代码
  private async saveExtractedCodes(codes: ExtractedCode[]): Promise<any[]> {
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
              sourceUrl: extractedCode.sourceUrl || null,
              sourceId: `claude_${Date.now()}`,
              sourceType: 'claude',
              notes: `Auto-collected via Claude AI from ${extractedCode.source}`
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
        logger.info(`Saved new code: ${extractedCode.code} from ${extractedCode.source}`);

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
          source: 'claude_monitor',
          metadata: metadata ? JSON.stringify(metadata) : undefined
        }
      });
    } catch (error) {
      logger.error('Failed to log monitor activity:', error);
    }
  }

  // 手动触发代码搜索（用于 API 调用）
  static async manualSearch(): Promise<ExtractedCode[]> {
    const service = this.getInstance();
    logger.info('Manual code search triggered');

    try {
      const codes = await service.searchAndExtractCodes();

      if (codes.length > 0) {
        await service.saveExtractedCodes(codes);
      }

      return codes;
    } catch (error) {
      logger.error('Manual search failed:', error);
      throw error;
    }
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
      source: 'claude_monitor'
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
}
