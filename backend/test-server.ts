import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { runRealRedditMonitoring } from './real-reddit-monitor';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: (error as Error).message
    });
  }
});

// 测试获取代码
app.get('/api/v1/codes', async (req, res) => {
  try {
    const codes = await prisma.shiftCode.findMany({
      include: {
        platforms: true
      },
      take: 10
    });

    res.json({
      success: true,
      data: codes,
      count: codes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// 测试获取用户
app.get('/api/v1/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        isPremium: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// 测试数据库统计
app.get('/api/v1/stats', async (req, res) => {
  try {
    const [userCount, codeCount, favoriteCount] = await Promise.all([
      prisma.user.count(),
      prisma.shiftCode.count(),
      prisma.favorite.count()
    ]);

    res.json({
      success: true,
      data: {
        users: userCount,
        codes: codeCount,
        favorites: favoriteCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Reddit监控演示端点
app.post('/api/v1/reddit/simulate', async (req, res) => {
  try {
    console.log('🤖 Running Reddit monitoring simulation...');

    // 模拟发现新代码
    const newCodes = [
      {
        code: `DEMO${Math.floor(Math.random() * 10000)}-SHIFT-CODE0-FOUND-TODAY`,
        rewardDescription: 'Demo Golden Keys',
        sourceUrl: 'https://reddit.com/r/Borderlands/demo',
        sourceId: `demo_${Date.now()}`
      }
    ];

    // 模拟添加到数据库
    for (const codeData of newCodes) {
      const existing = await prisma.shiftCode.findUnique({
        where: { code: codeData.code }
      });

      if (!existing) {
        await prisma.$transaction(async (tx) => {
          const code = await tx.shiftCode.create({
            data: {
              code: codeData.code,
              rewardDescription: codeData.rewardDescription,
              status: 'active',
              sourceUrl: codeData.sourceUrl,
              sourceId: codeData.sourceId,
              notes: 'Reddit monitoring simulation',
              createdById: 'cmg3vi9dq0000ro96mlbbwcjw'
            }
          });

          await tx.codePlatform.createMany({
            data: [
              { codeId: code.id, platform: 'PC' },
              { codeId: code.id, platform: 'PlayStation' },
              { codeId: code.id, platform: 'Xbox' }
            ]
          });

        });

        console.log(`✅ Added demo code: ${codeData.code}`);
      }
    }

    res.json({
      success: true,
      message: 'Reddit monitoring simulation completed',
      newCodes: newCodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Real Reddit监控端点
app.post('/api/v1/reddit/monitor', async (req, res) => {
  try {
    console.log('🚀 Starting real Reddit monitoring...');

    // Check if Reddit monitoring is enabled
    if (process.env.ENABLE_REDDIT_MONITORING !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Reddit monitoring is disabled',
        message: 'Set ENABLE_REDDIT_MONITORING=true in .env to enable this feature'
      });
    }

    // Check if required environment variables are set
    const requiredEnvVars = [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_USER_AGENT',
      'REDDIT_USERNAME',
      'REDDIT_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing Reddit API credentials',
        missingVariables: missingVars,
        message: 'Please configure all Reddit API credentials in .env file'
      });
    }

    // Run real Reddit monitoring
    const result = await runRealRedditMonitoring();

    return res.json({
      success: true,
      message: 'Real Reddit monitoring completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Real Reddit monitoring failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Real Reddit monitoring failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Reddit API连接测试端点
app.post('/api/v1/reddit/test', async (req, res) => {
  try {
    console.log('🔍 Testing Reddit API connection...');

    // 检查环境变量
    const requiredEnvVars = [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_USER_AGENT',
      'REDDIT_USERNAME',
      'REDDIT_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName] === `your-${varName.toLowerCase().replace('reddit_', '').replace('_', '-')}`);

    if (missingVars.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or unconfigured Reddit API credentials',
        missingVariables: missingVars,
        message: 'Please check your .env file and configure the Reddit API credentials. See REDDIT_SETUP.md for instructions.'
      });
    }

    // 模拟Reddit API连接测试（这里只验证配置存在）
    const config = {
      clientId: process.env.REDDIT_CLIENT_ID?.substring(0, 4) + '...',
      userAgent: process.env.REDDIT_USER_AGENT,
      username: process.env.REDDIT_USERNAME,
      subreddit: process.env.REDDIT_SUBREDDIT || 'Borderlands'
    };

    return res.json({
      success: true,
      message: 'Reddit API configuration test completed',
      configuration: config,
      status: 'Ready for production use',
      timestamp: new Date().toISOString(),
      note: 'Real Reddit API testing requires valid credentials. This test only validates configuration presence.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
      message: 'Reddit API test failed'
    });
  }
});

// API 根信息
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'sora2 code API Test Server',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'GET /api/v1/codes - Get codes',
      'GET /api/v1/users - Get users',
      'GET /api/v1/stats - Get statistics',
      'POST /api/v1/reddit/simulate - Simulate Reddit monitoring',
      'POST /api/v1/reddit/test - Test Reddit API configuration',
      'POST /api/v1/reddit/monitor - Real Reddit monitoring (requires credentials)'
    ]
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log('🚀 Test server running on http://localhost:' + PORT);
      console.log('📊 API: http://localhost:' + PORT + '/api/v1');
      console.log('🏥 Health: http://localhost:' + PORT + '/health');
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();