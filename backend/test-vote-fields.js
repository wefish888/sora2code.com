const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const code = await prisma.shiftCode.findFirst();

    if (code) {
      console.log('\n=== Sample Code Record ===');
      console.log('ID:', code.id);
      console.log('Code:', code.code);
      console.log('copyCount:', code.copyCount);
      console.log('upvoteCount:', code.upvoteCount);
      console.log('downvoteCount:', code.downvoteCount);
      console.log('\n=== All Fields ===');
      console.log(Object.keys(code));
    } else {
      console.log('No codes found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
