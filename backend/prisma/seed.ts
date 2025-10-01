import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库种子数据初始化...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sora2code.com' },
    update: {},
    create: {
      email: 'admin@sora2code.com',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      isActive: true,
      bio: 'System Administrator'
    }
  });

  console.log('✅ 管理员用户已创建:', admin.email);

  // 创建测试用户
  const userPassword = await bcrypt.hash('user123456', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@sora2code.com' },
    update: {},
    create: {
      email: 'user@sora2code.com',
      username: 'testuser',
      password: userPassword,
      role: 'user',
      isVerified: true,
      isActive: true,
      bio: 'Test User for sora2 code'
    }
  });

  console.log('✅ 测试用户已创建:', testUser.email);

  // 创建示例Shift代码
  const sampleCodes = [
    {
      code: 'KXKBT-JJTHW-T3TBB-T3TJ3-6XJXZ',
      rewardDescription: '5 Golden Keys',
      status: 'active',
      platforms: ['PC', 'PlayStation', 'Xbox'],
      sourceUrl: 'https://reddit.com/r/Borderlands/sample1',
      sourceId: 'sample1',
      notes: 'Sample code from Reddit'
    },
    {
      code: 'Z65B3-JCJ6T-TJBBT-3J33J-RSWZR',
      rewardDescription: '3 Diamond Keys',
      status: 'active',
      platforms: ['PC', 'Xbox'],
      sourceUrl: 'https://reddit.com/r/Borderlands/sample2',
      sourceId: 'sample2',
      notes: 'Limited platform availability'
    },
    {
      code: 'WS6BT-FXKRT-TB33T-BJT3B-JZWZ6',
      rewardDescription: 'Legendary Weapon',
      status: 'expired',
      expiresAt: new Date('2024-01-01'),
      platforms: ['PC', 'PlayStation', 'Xbox'],
      sourceUrl: 'https://reddit.com/r/Borderlands/sample3',
      sourceId: 'sample3',
      notes: 'Expired holiday code'
    },
    {
      code: 'HXKBJ-RJTHB-TJBBT-T3J3B-6XJXR',
      rewardDescription: '1000 Eridium',
      status: 'active',
      platforms: ['PlayStation'],
      sourceUrl: 'https://reddit.com/r/Borderlands/sample4',
      sourceId: 'sample4',
      notes: 'PlayStation exclusive'
    },
    {
      code: 'BXKBT-WJTHW-TJBBT-TJJTJ-ZXJXZ',
      rewardDescription: 'Cosmetic Skin Pack',
      status: 'pending',
      platforms: ['PC', 'PlayStation', 'Xbox'],
      sourceUrl: 'https://reddit.com/r/Borderlands/sample5',
      sourceId: 'sample5',
      notes: 'Verification pending'
    }
  ];

  console.log('🎮 创建示例Shift代码...');

  for (const codeData of sampleCodes) {
    const { platforms, ...shiftCodeData } = codeData;

    const existingCode = await prisma.shiftCode.findUnique({
      where: { code: codeData.code }
    });

    if (existingCode) {
      console.log(`⏭️  代码 ${codeData.code} 已存在，跳过`);
      continue;
    }

    const shiftCode = await prisma.shiftCode.create({
      data: {
        ...shiftCodeData,
        createdById: admin.id
      }
    });

    // 创建平台关联
    for (const platform of platforms) {
      await prisma.codePlatform.create({
        data: {
          codeId: shiftCode.id,
          platform
        }
      });
    }

    console.log(`✅ 创建代码: ${codeData.code} (${platforms.join(', ')})`);
  }

  // 创建一些测试收藏
  const activeCodes = await prisma.shiftCode.findMany({
    where: { status: 'active' },
    take: 2
  });

  for (const code of activeCodes) {
    await prisma.favorite.upsert({
      where: {
        userId_codeId: {
          userId: testUser.id,
          codeId: code.id
        }
      },
      update: {},
      create: {
        userId: testUser.id,
        codeId: code.id
      }
    });

    console.log(`⭐ 用户收藏代码: ${code.code}`);
  }

  // 创建一些测试活动记录
  await prisma.userActivity.createMany({
    data: [
      {
        userId: admin.id,
        action: 'register',
        metadata: JSON.stringify({ ip: '127.0.0.1' })
      },
      {
        userId: testUser.id,
        action: 'register',
        metadata: JSON.stringify({ ip: '127.0.0.1' })
      },
      {
        userId: testUser.id,
        action: 'login',
        metadata: JSON.stringify({ ip: '127.0.0.1', userAgent: 'Test Browser' })
      }
    ]
  });

  console.log('📊 创建用户活动记录');

  // 创建一些代码事件
  if (activeCodes.length > 0) {
    await prisma.codeEvent.createMany({
      data: [
        {
          codeId: activeCodes[0].id,
          userId: testUser.id,
          eventType: 'copy',
          metadata: JSON.stringify({ ip: '127.0.0.1' })
        },
        {
          codeId: activeCodes[0].id,
          userId: testUser.id,
          eventType: 'favorite',
          metadata: JSON.stringify({})
        }
      ]
    });

    // 更新复制计数
    await prisma.shiftCode.update({
      where: { id: activeCodes[0].id },
      data: { copyCount: 1 }
    });

    console.log('🎯 创建代码事件记录');
  }

  // 创建系统日志
  await prisma.systemLog.createMany({
    data: [
      {
        level: 'info',
        message: 'Database seeded successfully',
        source: 'seed_script',
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      },
      {
        level: 'info',
        message: 'Reddit monitor initialized',
        source: 'reddit_monitor',
        metadata: JSON.stringify({ subreddit: 'Borderlands' })
      }
    ]
  });

  console.log('📝 创建系统日志');

  console.log('🎉 数据库种子数据初始化完成！');
  console.log('');
  console.log('📊 创建的数据统计:');
  console.log(`👥 用户: ${await prisma.user.count()}`);
  console.log(`🎮 Shift代码: ${await prisma.shiftCode.count()}`);
  console.log(`🎯 平台关联: ${await prisma.codePlatform.count()}`);
  console.log(`⭐ 收藏: ${await prisma.favorite.count()}`);
  console.log(`📋 用户活动: ${await prisma.userActivity.count()}`);
  console.log(`🎪 代码事件: ${await prisma.codeEvent.count()}`);
  console.log(`📝 系统日志: ${await prisma.systemLog.count()}`);
  console.log('');
  console.log('🔑 默认登录信息:');
  console.log('管理员 - Email: admin@sora2code.com, Password: admin123456');
  console.log('测试用户 - Email: user@sora2code.com, Password: user123456');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 种子数据初始化失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });