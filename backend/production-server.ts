import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { runRealRedditMonitoring } from './real-reddit-monitor';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = 4000;

// Security and middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4321'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get shift codes
app.get('/api/v1/codes', async (req, res) => {
  try {
    const { limit = 20, status } = req.query;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const codes = await prisma.shiftCode.findMany({
      where: whereClause,
      include: {
        platforms: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: codes,
      count: codes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get statistics
app.get('/api/v1/stats', async (req, res) => {
  try {
    const [userCount, codeCount, favoriteCount, activeCodes] = await Promise.all([
      prisma.user.count(),
      prisma.shiftCode.count(),
      prisma.favorite.count(),
      prisma.shiftCode.count({ where: { status: 'active' } })
    ]);

    res.json({
      success: true,
      data: {
        users: userCount,
        codes: codeCount,
        activeCodes: activeCodes,
        favorites: favoriteCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Reddit monitoring simulation
app.post('/api/v1/reddit/simulate', async (req, res) => {
  try {
    console.log('🤖 Running Reddit monitoring simulation...');

    const newCode = {
      code: `PROD${Math.floor(Math.random() * 10000)}-SHIFT-CODE0-FOUND-TODAY`,
      rewardDescription: 'Production Golden Keys',
      sourceUrl: 'https://reddit.com/r/Borderlands/production',
      sourceId: `prod_${Date.now()}`
    };

    const existing = await prisma.shiftCode.findUnique({
      where: { code: newCode.code }
    });

    if (!existing) {
      await prisma.$transaction(async (tx) => {
        const code = await tx.shiftCode.create({
          data: {
            code: newCode.code,
            rewardDescription: newCode.rewardDescription,
            status: 'active',
            sourceUrl: newCode.sourceUrl,
            sourceId: newCode.sourceId,
            notes: 'Production Reddit monitoring simulation',
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

      console.log(`✅ Added production demo code: ${newCode.code}`);
    }

    res.json({
      success: true,
      message: 'Reddit monitoring simulation completed',
      newCodes: existing ? 0 : 1,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Real Reddit monitoring
app.post('/api/v1/reddit/monitor', async (req, res) => {
  try {
    console.log('🚀 Starting real Reddit monitoring...');

    // Check if Reddit monitoring is enabled
    if (process.env.ENABLE_REDDIT_MONITORING !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Reddit monitoring is disabled',
        message: 'Set ENABLE_REDDIT_MONITORING=true in environment to enable this feature'
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
        message: 'Please configure all Reddit API credentials in environment'
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

// API root
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'sora2 code Production API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    endpoints: [
      'GET /health - Health check',
      'GET /api/v1/codes - Get shift codes',
      'GET /api/v1/stats - Get statistics',
      'POST /api/v1/reddit/simulate - Simulate Reddit monitoring',
      'POST /api/v1/reddit/monitor - Real Reddit monitoring (requires credentials)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Catch-all route
app.get('*', (req, res) => {
  res.redirect('/api/v1');
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');

    // Ensure environment is set
    const env = process.env.NODE_ENV || 'development';
    console.log(`🌍 Environment: ${env}`);

    app.listen(PORT, () => {
      console.log('🚀 sora2code Production Server started');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Health: http://localhost:${PORT}/health`);
      console.log(`📊 API: http://localhost:${PORT}/api/v1`);
      console.log(`🎮 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:4321'}`);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;