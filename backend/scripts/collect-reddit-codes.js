const axios = require('axios');

// Reddit代码采集脚本
async function collectRedditCodes() {
  console.log('🔍 开始从Reddit采集Borderlands代码...');

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ];

  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

  const client = axios.create({
    timeout: 30000,
    headers: {
      'User-Agent': randomUA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'DNT': '1'
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    }
  });

  // 尝试多种URL策略
  const urls = [
    'https://www.reddit.com/r/Borderlands/new.json?limit=50',
    'https://www.reddit.com/r/Borderlands/search.json?q=codes+OR+shift+OR+keys&restrict_sr=1&sort=new&t=week&limit=50',
    'https://old.reddit.com/r/Borderlands/new.json?limit=50',
    'https://reddit.com/r/Borderlands.json?limit=50',
    'https://www.reddit.com/r/borderlands3/search.json?q=codes+OR+shift&restrict_sr=1&sort=new&t=week&limit=30',
    'https://www.reddit.com/r/borderlands4/search.json?q=codes+OR+shift&restrict_sr=1&sort=new&t=week&limit=30'
  ];

  const allCodes = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(`📡 尝试URL ${i + 1}/${urls.length}: ${url}`);

      if (i > 0) {
        console.log('⏳ 等待中以避免被检测...');
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      }

      const response = await client.get(url);

      if (response.status === 403 || response.status === 429) {
        console.log(`❌ 收到状态 ${response.status}，尝试下个URL...`);
        continue;
      }

      if (response.status !== 200) {
        console.log(`⚠️  收到状态 ${response.status}，跳过...`);
        continue;
      }

      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (parseError) {
          console.log('❌ JSON解析失败，跳过...');
          continue;
        }
      }

      if (!data || !data.data || !Array.isArray(data.data.children)) {
        console.log('❌ 无效的响应结构，跳过...');
        continue;
      }

      const posts = data.data.children.map(child => child.data);

      // 过滤包含代码关键词的帖子
      const filteredPosts = posts.filter(post => {
        const text = `${post.title} ${post.selftext}`.toLowerCase();
        return text.includes('code') ||
               text.includes('shift') ||
               text.includes('bl4') ||
               text.includes('borderlands') ||
               text.includes('keys') ||
               text.includes('golden') ||
               text.includes('diamond');
      });

      console.log(`✅ 从 ${url} 获取到 ${filteredPosts.length} 个相关帖子（总共 ${posts.length} 个）`);

      // 提取代码
      for (const post of filteredPosts) {
        const codes = extractCodesFromPost(post);
        if (codes.length > 0) {
          allCodes.push(...codes.map(code => ({
            ...code,
            source: {
              url: `https://reddit.com${post.permalink}`,
              title: post.title,
              author: post.author,
              created: new Date(post.created_utc * 1000).toISOString()
            }
          })));
        }
      }

      // 如果成功获取到数据，不需要尝试其他URL（除非想要更多数据）
      if (filteredPosts.length > 0) {
        break;
      }

    } catch (error) {
      console.log(`❌ 从 ${url} 获取失败:`, error.message);
      continue;
    }
  }

  console.log(`\n🎯 采集结果总结:`);
  console.log(`📊 找到代码总数: ${allCodes.length}`);

  if (allCodes.length > 0) {
    console.log(`\n🔑 采集到的代码列表:`);
    allCodes.forEach((item, index) => {
      console.log(`\n${index + 1}. 代码: ${item.code}`);
      console.log(`   奖励: ${item.description || '未知'}`);
      console.log(`   平台: ${item.platforms.join(', ')}`);
      console.log(`   来源: ${item.source.title}`);
      console.log(`   作者: ${item.source.author}`);
      console.log(`   时间: ${item.source.created}`);
      console.log(`   链接: ${item.source.url}`);
    });

    // 保存到文件
    const fs = require('fs');
    const path = require('path');

    const outputPath = path.join(__dirname, 'reddit-codes.json');
    fs.writeFileSync(outputPath, JSON.stringify(allCodes, null, 2));
    console.log(`\n💾 代码已保存到: ${outputPath}`);
  }

  return allCodes;
}

// 从帖子中提取代码的函数
function extractCodesFromPost(post) {
  const text = `${post.title} ${post.selftext}`;
  const codes = [];

  // Borderlands shift codes 通常是5个字符的组合，用连字符分隔
  const codePattern = /\b([A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5})\b/gi;
  const matches = text.match(codePattern);

  if (matches) {
    for (const match of matches) {
      const code = match.toUpperCase();
      const platforms = detectPlatforms(text, code);
      const description = extractRewardDescription(text, code);

      codes.push({
        code,
        description,
        platforms
      });
    }
  }

  return codes;
}

// 检测平台
function detectPlatforms(text, code) {
  const platforms = [];
  const lowerText = text.toLowerCase();

  const codeIndex = lowerText.indexOf(code.toLowerCase());
  const contextStart = Math.max(0, codeIndex - 100);
  const contextEnd = Math.min(text.length, codeIndex + code.length + 100);
  const context = lowerText.slice(contextStart, contextEnd);

  if (context.includes('pc') || context.includes('steam') || context.includes('epic')) {
    platforms.push('PC');
  }
  if (context.includes('xbox') || context.includes('microsoft')) {
    platforms.push('Xbox');
  }
  if (context.includes('playstation') || context.includes('ps4') || context.includes('ps5') || context.includes('sony')) {
    platforms.push('PlayStation');
  }

  // 如果没有找到特定平台，默认为所有平台
  if (platforms.length === 0) {
    platforms.push('PC', 'Xbox', 'PlayStation');
  }

  return platforms;
}

// 提取奖励描述
function extractRewardDescription(text, code) {
  const codeIndex = text.toLowerCase().indexOf(code.toLowerCase());

  const contextStart = Math.max(0, codeIndex - 200);
  const contextEnd = Math.min(text.length, codeIndex + code.length + 200);
  const context = text.slice(contextStart, contextEnd);

  const rewardPatterns = [
    /golden keys?/i,
    /diamond keys?/i,
    /skeleton keys?/i,
    /guns?/i,
    /weapons?/i,
    /skin/i,
    /cosmetic/i,
    /eridium/i,
    /cash/i,
    /money/i
  ];

  for (const pattern of rewardPatterns) {
    const match = context.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

// 运行脚本
if (require.main === module) {
  collectRedditCodes()
    .then(codes => {
      console.log(`\n✅ 采集完成! 总共找到 ${codes.length} 个代码`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 采集失败:', error);
      process.exit(1);
    });
}

module.exports = { collectRedditCodes };