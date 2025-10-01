const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRedditCodes() {
  try {
    const codes = await prisma.shiftCode.findMany({
      select: {
        id: true,
        code: true,
        rewardDescription: true,
        sourceUrl: true,
        sourceId: true,
        notes: true,
        createdAt: true
      }
    });

    console.log('Total codes:', codes.length);
    console.log('\nAll codes:');
    codes.forEach(code => {
      const isFromReddit = code.sourceUrl?.includes('reddit') || code.notes?.includes('Reddit');
      console.log(`- ${code.code} (Reddit: ${isFromReddit}) - Source: ${code.sourceUrl || 'N/A'} - Notes: ${code.notes || 'N/A'}`);
    });

    const redditCodes = codes.filter(code => code.sourceUrl?.includes('reddit') || code.notes?.includes('Reddit'));
    console.log(`\nReddit codes found: ${redditCodes.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRedditCodes();