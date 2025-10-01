#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

async function startDevelopment() {
  console.log('🚀 启动BL4 Codes开发环境...');
  console.log('');

  try {
    // 检查是否存在数据库
    const dbPath = join(process.cwd(), 'dev.db');
    const dbExists = existsSync(dbPath);

    if (!dbExists) {
      console.log('📊 未发现数据库，开始初始化...');
      await execAsync('npm run db:setup');
      console.log('✅ 数据库初始化完成');
    } else {
      console.log('📊 数据库已存在，跳过初始化');
    }

    // 生成Prisma客户端（确保最新）
    console.log('🔧 确保Prisma客户端最新...');
    await execAsync('npx prisma generate');

    console.log('');
    console.log('🎉 开发环境准备完成！');
    console.log('');
    console.log('📋 快速命令：');
    console.log('- 启动服务器: npm run dev');
    console.log('- 查看数据库: npm run db:studio');
    console.log('- 重置数据库: npm run db:reset');
    console.log('');
    console.log('🌐 服务地址：');
    console.log('- API: http://localhost:3000/api/v1');
    console.log('- 健康检查: http://localhost:3000/health');
    console.log('');
    console.log('🔑 测试账号：');
    console.log('- 管理员: admin@sora2code.com / admin123456');
    console.log('- 用户: user@sora2code.com / user123456');

  } catch (error) {
    console.error('❌ 开发环境启动失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  startDevelopment();
}

export { startDevelopment };