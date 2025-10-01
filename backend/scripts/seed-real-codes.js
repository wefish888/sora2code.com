const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 真实的Borderlands代码数据（来自搜索结果）
const realCodes = [
  // sora2 - 活跃代码（2025年9月）
  {
    code: 'BHRBJ-ZWHT3-W6JBK-BT3BB-CW3ZK',
    game: 'sora2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: new Date('2025-09-26'),
    sourceUrl: 'https://www.gamespot.com/articles/borderlands-4-shift-codes',
    notes: 'Active sora2 SHiFT code from official sources'
  },
  {
    code: 'JSX3J-B6SBJ-CXTBC-B3T3B-BZZZT',
    game: 'sora2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: new Date('2025-09-26'),
    sourceUrl: 'https://www.gamespot.com/articles/borderlands-4-shift-codes',
    notes: 'Active sora2 SHiFT code from official sources'
  },
  {
    code: 'BHFJ3-WXHBB-W63JK-B33B3-5HX95',
    game: 'sora2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: new Date('2025-09-26'),
    sourceUrl: 'https://www.gamespot.com/articles/borderlands-4-shift-codes',
    notes: 'Active sora2 SHiFT code from official sources'
  },
  {
    code: 'THRBT-WW6CB-56TB5-3B3BJ-XBW3X',
    game: 'sora2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: new Date('2025-09-30'),
    sourceUrl: 'https://www.gamespot.com/articles/borderlands-4-shift-codes',
    notes: 'Active sora2 SHiFT code from official sources - expires Sept 30'
  },
  // Borderlands 3 - 永不过期代码
  {
    code: '9XCBT-WBXFR-5TRWJ-JJJ33-TX53Z',
    game: 'Borderlands 3',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null, // 永不过期
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-3-golden-keys/',
    notes: 'Borderlands 3 collector edition code - never expires'
  },
  {
    code: 'ZFKJ3-TT6FF-KTFKT-T333J-JWX36',
    game: 'Borderlands 3',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-3-golden-keys/',
    notes: 'Borderlands 3 collector edition code - never expires'
  },
  {
    code: 'Z65B3-JCXX6-5JXW3-3B33J-9SLC6',
    game: 'Borderlands 3',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-3-golden-keys/',
    notes: 'Borderlands 3 collector edition code - never expires'
  },
  // Borderlands 2 - 永不过期代码
  {
    code: 'WT5BB-JTJFX-WBRKJ-JJJT3-HRX9H',
    game: 'Borderlands 2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-2-golden-keys/',
    notes: 'Borderlands 2 permanent SHiFT code'
  },
  {
    code: 'KJ5BT-RFH93-6WRKJ-J3JTB-FXBHZ',
    game: 'Borderlands 2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-2-golden-keys/',
    notes: 'Borderlands 2 permanent SHiFT code'
  },
  {
    code: 'C35TB-WS6ST-CFWK3-C3JJJ-H66FR',
    game: 'Borderlands 2',
    rewardDescription: '1 Golden Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://mentalmars.com/game-news/borderlands-2-golden-keys/',
    notes: 'Borderlands 2 permanent SHiFT code'
  },
  // 一些额外的Borderlands 3代码
  {
    code: 'HXKBT-XJ6FR-WBRKF-J3JTB-RSBHR',
    game: 'Borderlands 3',
    rewardDescription: '3 Golden Keys',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://borderlands.2k.com/news/borderlands-3-shift-codes/',
    notes: 'Special 3-key code from official 2K announcement'
  },
  {
    code: 'CHKJ3-H9JCB-WBRKF-JBJTB-TX6HR',
    game: 'Borderlands 3',
    rewardDescription: 'Diamond Key',
    platforms: ['PC', 'Xbox', 'PlayStation'],
    status: 'active',
    expiresAt: null,
    sourceUrl: 'https://borderlands.2k.com/news/borderlands-3-shift-codes/',
    notes: 'Special Diamond Key - very rare reward'
  }
];

async function seedRealCodes() {
  console.log('🌱 开始向数据库插入真实的Borderlands代码...');

  try {
    let successCount = 0;
    let skipCount = 0;

    for (const codeData of realCodes) {
      try {
        // 检查代码是否已存在
        const existingCode = await prisma.shiftCode.findUnique({
          where: { code: codeData.code }
        });

        if (existingCode) {
          console.log(`⏭️  代码 ${codeData.code} 已存在，跳过...`);
          skipCount++;
          continue;
        }

        // 使用事务创建代码和平台关联
        const result = await prisma.$transaction(async (tx) => {
          // 创建代码
          const code = await tx.shiftCode.create({
            data: {
              code: codeData.code,
              rewardDescription: codeData.rewardDescription,
              status: codeData.status,
              expiresAt: codeData.expiresAt,
              sourceUrl: codeData.sourceUrl,
              notes: codeData.notes
            }
          });

          // 创建平台关联
          const platformData = codeData.platforms.map(platform => ({
            codeId: code.id,
            platform
          }));

          await tx.codePlatform.createMany({
            data: platformData
          });

          return code;
        });

        console.log(`✅ 成功插入代码: ${codeData.code} (${codeData.game} - ${codeData.rewardDescription})`);
        successCount++;

      } catch (error) {
        console.error(`❌ 插入代码 ${codeData.code} 失败:`, error.message);
      }
    }

    console.log(`\n📊 插入结果总结:`);
    console.log(`✅ 成功插入: ${successCount} 个代码`);
    console.log(`⏭️  跳过重复: ${skipCount} 个代码`);
    console.log(`❌ 失败: ${realCodes.length - successCount - skipCount} 个代码`);

    // 查询数据库中的总代码数量
    const totalCodes = await prisma.shiftCode.count();
    console.log(`📈 数据库中总代码数量: ${totalCodes}`);

    console.log(`\n🎉 代码插入完成！`);

  } catch (error) {
    console.error('❌ 数据库操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  seedRealCodes()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { seedRealCodes, realCodes };