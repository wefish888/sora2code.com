const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCodes() {
  console.log('🔍 验证数据库中的代码...\n');

  try {
    // 获取所有代码及其平台信息
    const codes = await prisma.shiftCode.findMany({
      include: {
        platforms: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 数据库统计:`);
    console.log(`总代码数量: ${codes.length}`);

    // 按状态统计
    const statusStats = codes.reduce((acc, code) => {
      acc[code.status] = (acc[code.status] || 0) + 1;
      return acc;
    }, {});

    console.log('按状态分布:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 个`);
    });

    // 按游戏统计
    const gameStats = codes.reduce((acc, code) => {
      const game = code.notes?.includes('sora2') ? 'sora2' :
                   code.notes?.includes('Borderlands 3') ? 'Borderlands 3' :
                   code.notes?.includes('Borderlands 2') ? 'Borderlands 2' : 'Unknown';
      acc[game] = (acc[game] || 0) + 1;
      return acc;
    }, {});

    console.log('按游戏分布:');
    Object.entries(gameStats).forEach(([game, count]) => {
      console.log(`  ${game}: ${count} 个`);
    });

    // 按奖励类型统计
    const rewardStats = codes.reduce((acc, code) => {
      const reward = code.rewardDescription || 'Unknown';
      acc[reward] = (acc[reward] || 0) + 1;
      return acc;
    }, {});

    console.log('按奖励类型分布:');
    Object.entries(rewardStats).forEach(([reward, count]) => {
      console.log(`  ${reward}: ${count} 个`);
    });

    console.log(`\n📋 最新添加的代码列表:\n`);

    // 显示最新的12个代码（刚添加的）
    const latestCodes = codes.slice(0, 12);
    latestCodes.forEach((code, index) => {
      console.log(`${index + 1}. 代码: ${code.code}`);
      console.log(`   奖励: ${code.rewardDescription || '未知'}`);
      console.log(`   状态: ${code.status}`);
      console.log(`   平台: ${code.platforms.map(p => p.platform).join(', ')}`);
      if (code.expiresAt) {
        const expiry = new Date(code.expiresAt);
        const now = new Date();
        const isExpired = expiry < now;
        console.log(`   过期时间: ${expiry.toLocaleDateString()} ${isExpired ? '❌ 已过期' : '✅ 有效'}`);
      } else {
        console.log(`   过期时间: ♾️  永不过期`);
      }
      console.log(`   来源: ${code.sourceUrl || '未知'}`);
      console.log(`   备注: ${code.notes || '无'}`);
      console.log(`   添加时间: ${new Date(code.createdAt).toLocaleString()}`);
      console.log('');
    });

    // 检查即将过期的代码
    const now = new Date();
    const soonExpiringCodes = codes.filter(code => {
      if (!code.expiresAt) return false;
      const expiry = new Date(code.expiresAt);
      const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7; // 7天内过期
    });

    if (soonExpiringCodes.length > 0) {
      console.log(`⚠️  即将过期的代码 (7天内):\n`);
      soonExpiringCodes.forEach((code, index) => {
        const expiry = new Date(code.expiresAt);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        console.log(`${index + 1}. ${code.code} - 还有 ${daysLeft} 天过期 (${expiry.toLocaleDateString()})`);
      });
    }

    // 检查已过期的代码
    const expiredCodes = codes.filter(code => {
      if (!code.expiresAt) return false;
      return new Date(code.expiresAt) < now;
    });

    if (expiredCodes.length > 0) {
      console.log(`❌ 已过期的代码:\n`);
      expiredCodes.forEach((code, index) => {
        console.log(`${index + 1}. ${code.code} - 过期于 ${new Date(code.expiresAt).toLocaleDateString()}`);
      });
    }

    console.log(`\n✅ 验证完成！数据库中有 ${codes.length} 个代码，其中 ${codes.filter(c => c.status === 'active').length} 个处于活跃状态。`);

  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  verifyCodes()
    .then(() => {
      console.log('✅ 验证脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 验证脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { verifyCodes };