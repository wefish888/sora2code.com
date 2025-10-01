const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Get first code
    const code = await prisma.shiftCode.findFirst();

    if (!code) {
      console.log('No codes found');
      return;
    }

    console.log('\n=== Before Vote ===');
    console.log('Code ID:', code.id);
    console.log('Code:', code.code);
    console.log('upvoteCount:', code.upvoteCount);
    console.log('downvoteCount:', code.downvoteCount);

    // Simulate a vote
    const testIp = '192.168.1.100';

    // Create a vote
    await prisma.codeVote.create({
      data: {
        codeId: code.id,
        voteType: 'upvote',
        ipAddress: testIp
      }
    });

    // Update vote count
    await prisma.shiftCode.update({
      where: { id: code.id },
      data: {
        upvoteCount: { increment: 1 }
      }
    });

    // Check after vote
    const updatedCode = await prisma.shiftCode.findUnique({
      where: { id: code.id }
    });

    console.log('\n=== After Vote ===');
    console.log('upvoteCount:', updatedCode.upvoteCount);
    console.log('downvoteCount:', updatedCode.downvoteCount);

    // Cleanup - remove test vote
    await prisma.codeVote.deleteMany({
      where: {
        codeId: code.id,
        ipAddress: testIp
      }
    });

    await prisma.shiftCode.update({
      where: { id: code.id },
      data: {
        upvoteCount: { decrement: 1 }
      }
    });

    console.log('\n✅ Vote test completed successfully');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
