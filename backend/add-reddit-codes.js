const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addRedditCodes() {
  try {
    // 添加几个模拟从Reddit采集的代码
    const redditCodes = [
      {
        code: 'RBKJ3-TTXFF-KTFKT-T333J-JWX36',
        rewardDescription: '3 Golden Keys',
        sourceUrl: 'https://reddit.com/r/Borderlands/comments/test1/new_shift_code',
        sourceId: 'test1',
        notes: 'Auto-imported from Reddit r/Borderlands',
        platforms: ['PC', 'Xbox', 'PlayStation']
      },
      {
        code: 'RXCBT-WBXFR-5TRWJ-JJJ33-TX53Z',
        rewardDescription: '5 Golden Keys',
        sourceUrl: 'https://reddit.com/r/Borderlands/comments/test2/bl4_codes_working',
        sourceId: 'test2',
        notes: 'Auto-imported from Reddit r/Borderlands',
        platforms: ['PC', 'PlayStation']
      },
      {
        code: 'RWTBB-JTJFX-WBRKJ-JJJT3-HRX9H',
        rewardDescription: '1 Diamond Key',
        sourceUrl: 'https://reddit.com/r/Borderlands/comments/test3/diamond_key_code',
        sourceId: 'test3',
        notes: 'Auto-imported from Reddit r/Borderlands',
        platforms: ['PC', 'Xbox', 'PlayStation']
      }
    ];

    for (const codeData of redditCodes) {
      console.log(`Adding Reddit code: ${codeData.code}`);

      // 创建代码
      const newCode = await prisma.shiftCode.create({
        data: {
          code: codeData.code,
          rewardDescription: codeData.rewardDescription,
          status: 'active',
          sourceUrl: codeData.sourceUrl,
          sourceId: codeData.sourceId,
          notes: codeData.notes
        }
      });

      // 添加平台关联
      const platformData = codeData.platforms.map(platform => ({
        codeId: newCode.id,
        platform
      }));

      await prisma.codePlatform.createMany({
        data: platformData
      });

      console.log(`✅ Added code: ${codeData.code}`);
    }

    console.log(`\n✅ Successfully added ${redditCodes.length} Reddit codes`);

  } catch (error) {
    console.error('Error adding Reddit codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRedditCodes();