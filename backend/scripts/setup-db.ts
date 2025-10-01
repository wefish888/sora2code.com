#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

async function setupDatabase() {
  console.log('🚀 开始设置SQLite数据库...');
  console.log('');

  try {
    // 检查是否存在数据库文件
    const dbPath = join(process.cwd(), 'dev.db');
    const dbExists = existsSync(dbPath);

    if (dbExists) {
      console.log('📁 发现已存在的数据库文件');
      const response = await prompt('是否要重置数据库？这将删除所有现有数据。(y/N): ');

      if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
        console.log('🗑️  删除现有数据库...');
        const { unlinkSync } = await import('fs');
        unlinkSync(dbPath);
        console.log('✅ 数据库文件已删除');
      } else {
        console.log('⏭️  跳过数据库重置');
        return;
      }
    }

    // 生成Prisma客户端
    console.log('🔧 生成Prisma客户端...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma客户端生成完成');

    // 创建数据库迁移
    console.log('📊 创建数据库迁移...');
    await execAsync('npx prisma migrate dev --name init');
    console.log('✅ 数据库迁移完成');

    // 运行种子数据
    console.log('🌱 运行种子数据...');
    await execAsync('npm run db:seed');
    console.log('✅ 种子数据创建完成');

    console.log('');
    console.log('🎉 数据库设置完成！');
    console.log('');
    console.log('📊 你现在可以：');
    console.log('1. 启动开发服务器: npm run dev');
    console.log('2. 查看数据库: npm run db:studio');
    console.log('3. 访问API: http://localhost:3000/api/v1');
    console.log('');
    console.log('🔑 默认登录信息：');
    console.log('管理员: admin@sora2code.com / admin123456');
    console.log('测试用户: user@sora2code.com / user123456');

  } catch (error) {
    console.error('❌ 数据库设置失败:', error);
    process.exit(1);
  }
}

function prompt(question: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer);
    });
  });
}

// 运行设置脚本
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };