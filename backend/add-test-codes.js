const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestCodes() {
  try {
    console.log('Adding test Sora invite codes...\n');

    const testCodes = [
      { code: 'SORA01', description: 'Sora Beta Access' },
      { code: 'SORA02', description: 'Sora Video Generation' },
      { code: 'SORA03', description: 'Sora Early Access' },
      { code: 'INVITE1', description: 'Sora Premium Access' },
      { code: 'INVITE2', description: 'Sora Creator Access' },
      { code: 'TEST123', description: 'Sora Test Account' }
    ];

    for (const testCode of testCodes) {
      // Check if code already exists
      const existing = await prisma.shiftCode.findUnique({
        where: { code: testCode.code }
      });

      if (existing) {
        console.log(`⏭️  Code ${testCode.code} already exists, skipping...`);
        continue;
      }

      // Create code
      const code = await prisma.shiftCode.create({
        data: {
          code: testCode.code,
          rewardDescription: testCode.description,
          status: 'active',
          sourceUrl: 'https://reddit.com/r/OpenAI',
          sourceType: 'manual',
          notes: 'Test data for development'
        }
      });

      // Add platform (All)
      await prisma.codePlatform.create({
        data: {
          codeId: code.id,
          platform: 'All'
        }
      });

      console.log(`✅ Added code: ${testCode.code} - ${testCode.description}`);
    }

    console.log('\n✨ Test codes added successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCodes();
