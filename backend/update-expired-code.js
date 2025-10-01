const { prisma } = require('./src/utils/database');

async function updateExpiredCode() {
  try {
    // 找到第一个代码并设置为过期
    const firstCode = await prisma.shiftCode.findFirst();

    if (firstCode) {
      // 设置过期时间为1小时前
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000);

      const updatedCode = await prisma.shiftCode.update({
        where: { id: firstCode.id },
        data: {
          expiresAt: expiredDate,
          status: 'expired'
        }
      });

      console.log('Updated code to expired:');
      console.log(`Code: ${updatedCode.code}`);
      console.log(`Expires At: ${updatedCode.expiresAt}`);
      console.log(`Status: ${updatedCode.status}`);
    } else {
      console.log('No codes found');
    }
  } catch (error) {
    console.error('Error updating code:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExpiredCode();