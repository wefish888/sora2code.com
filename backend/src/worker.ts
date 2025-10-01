import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

// Import your existing routes and services
import { codesRoutes } from './routes/codes';
import { userRoutes } from './routes/users';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { cryptoRoutes } from './routes/crypto';

// Types for Cloudflare bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE?: R2Bucket;

  // Environment variables
  NODE_ENV: string;
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;

  // API Keys
  ANTHROPIC_API_KEY?: string;
  EMAIL_API_KEY?: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());

// CORS middleware
app.use('*', cors({
  origin: (origin, c) => {
    // 定义允许的域名列表
    const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:4321',
      'http://localhost:3000',
      'https://sora2code.com',
      'https://www.sora2code.com'
    ];

    console.log('[CORS] Request origin:', origin);
    console.log('[CORS] Allowed origins:', allowedOrigins);

    // 如果没有 origin（某些情况下的同源请求或非浏览器请求）
    if (!origin) {
      console.log('[CORS] No origin header, allowing request');
      return allowedOrigins[0]; // 返回第一个允许的源
    }

    // 检查 origin 是否在允许列表中
    if (allowedOrigins.includes(origin)) {
      console.log('[CORS] Origin allowed:', origin);
      return origin;
    }

    // 生产环境下严格检查，开发环境可以放宽
    if (c.env.NODE_ENV === 'development') {
      console.log('[CORS] Development mode, allowing origin:', origin);
      return origin;
    }

    console.warn('[CORS] Origin blocked:', origin);
    throw new HTTPException(403, { message: 'CORS: Origin not allowed' });
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Encryption', 'X-AES-Key'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  credentials: true
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
app.route('/api/v1/crypto', cryptoRoutes);
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/codes', codesRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/admin', adminRoutes);

// Global error handler
app.onError((err, c) => {
  console.error('Worker error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: c.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  }, 404);
});

// Scheduled event handler (cron jobs)
export default {
  // Main fetch handler
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  // Scheduled event handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered:', event.cron);

    // Add your scheduled tasks here
    switch (event.cron) {
      case '*/10 * * * *': // Every 10 minutes
        await verifyShiftCodes(env);
        break;
      default:
        console.log('Unknown cron schedule:', event.cron);
    }
  }
};

// Scheduled task functions
async function verifyShiftCodes(env: Env): Promise<void> {
  try {
    console.log('Starting scheduled code collection using Claude...');

    if (!env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      return;
    }

    // Use Claude to search and extract codes
    const extractedCodes = await searchAndExtractCodesWithClaude(env);
    console.log(`Found ${extractedCodes.length} codes from Claude`);

    let newCodesCount = 0;

    for (const extractedCode of extractedCodes) {
      try {
        // Check if code already exists
        const existing = await env.DB.prepare(
          'SELECT id FROM shift_codes WHERE code = ?'
        ).bind(extractedCode.code).first();

        if (existing) {
          console.log(`Code ${extractedCode.code} already exists, skipping`);
          continue;
        }

        // Insert new code
        const codeId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO shift_codes (id, code, rewardDescription, status, sourceUrl, sourceId, notes, createdAt, updatedAt)
          VALUES (?, ?, ?, 'active', ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          codeId,
          extractedCode.code,
          extractedCode.description || 'Sora2 Access',
          extractedCode.sourceUrl || null,
          `claude_${Date.now()}`,
          `Auto-collected via Claude AI from ${extractedCode.source}`
        ).run();

        // Insert platforms
        for (const platform of extractedCode.platforms) {
          await env.DB.prepare(`
            INSERT INTO code_platforms (codeId, platform)
            VALUES (?, ?)
          `).bind(codeId, platform).run();
        }

        newCodesCount++;
        console.log(`Saved new code: ${extractedCode.code} from ${extractedCode.source}`);
      } catch (error) {
        console.error(`Failed to save code ${extractedCode.code}:`, error);
      }
    }

    console.log(`Code collection completed. New codes: ${newCodesCount}`);

  } catch (error) {
    console.error('Error in scheduled code collection:', error);
  }
}

// Helper function to search and extract codes using Claude
async function searchAndExtractCodesWithClaude(env: Env): Promise<Array<{
  code: string;
  description?: string;
  platforms: string[];
  source: string;
  sourceUrl?: string;
}>> {
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return [];
    }

    const data: any = await response.json();
    const content = data.content[0].text;
    console.log('Claude response received');

    // Extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in Claude response');
      return [];
    }

    const codes = JSON.parse(jsonMatch[0]);

    // Validate and standardize codes
    const validatedCodes = codes
      .filter((item: any) => isValidInviteCode(item.code))
      .map((item: any) => ({
        code: item.code.toUpperCase(),
        description: item.description || 'Sora2 Access',
        platforms: ['All'],
        source: item.source || 'Web Search',
        sourceUrl: item.sourceUrl
      }));

    console.log(`Extracted ${validatedCodes.length} valid codes from Claude response`);
    return validatedCodes;

  } catch (error) {
    console.error('Failed to search and extract codes with Claude:', error);
    return [];
  }
}

function isValidInviteCode(code: string): boolean {
  // Must be 6 characters
  if (code.length !== 6) return false;

  // Must only contain letters and numbers
  if (!/^[A-Z0-9]{6}$/i.test(code)) return false;

  // Exclude common 6-letter English words
  const commonWords = ['THANKS', 'PLEASE', 'INVITE', 'ACCESS', 'UPDATE', 'REDDIT', 'OPENAI', 'REMOVE', 'DELETE', 'SEARCH'];
  if (commonWords.includes(code.toUpperCase())) return false;

  // Must contain mix of numbers and letters
  const hasNumber = /\d/.test(code);
  const hasLetter = /[A-Z]/i.test(code);

  return hasNumber && hasLetter;
}