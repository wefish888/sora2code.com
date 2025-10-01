import axios from 'axios';
import { prisma } from './src/utils/database';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  created_utc: number;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

class RealRedditMonitor {
  private accessToken: string | null = null;
  private httpClient = axios.create({
    baseURL: 'https://oauth.reddit.com',
    headers: {
      'User-Agent': process.env.REDDIT_USER_AGENT || 'sora2code/1.0.0',
    },
    timeout: 10000,
  });

  private async authenticate(): Promise<void> {
    try {
      console.log('🔐 Authenticating with Reddit API...');

      const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');

      const response = await axios.post('https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'password',
          username: process.env.REDDIT_USERNAME!,
          password: process.env.REDDIT_PASSWORD!,
        }), {
          headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': process.env.REDDIT_USER_AGENT!,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      console.log('✅ Successfully authenticated with Reddit API');
    } catch (error: any) {
      console.error('❌ Reddit authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  private extractCodesFromPost(post: RedditPost) {
    const text = `${post.title} ${post.selftext}`;
    const codes: Array<{code: string, description?: string, platforms: string[]}> = [];

    // Extract shift codes pattern
    const codePattern = /\\b([A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5})\\b/gi;
    const matches = text.match(codePattern);

    if (matches) {
      for (const match of matches) {
        const code = match.toUpperCase();

        // Detect platforms
        const platforms = this.detectPlatforms(text, code);

        // Extract reward description
        const description = this.extractRewardDescription(text, code);

        codes.push({
          code,
          description,
          platforms
        });
      }
    }

    return codes;
  }

  private detectPlatforms(text: string, code: string): string[] {
    const platforms: string[] = [];
    const lowerText = text.toLowerCase();

    // Find platform keywords near the code
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

    // If no specific platforms found, default to all
    if (platforms.length === 0) {
      platforms.push('PC', 'Xbox', 'PlayStation');
    }

    return platforms;
  }

  private extractRewardDescription(text: string, code: string): string | undefined {
    const codeIndex = text.toLowerCase().indexOf(code.toLowerCase());
    const contextStart = Math.max(0, codeIndex - 200);
    const contextEnd = Math.min(text.length, codeIndex + code.length + 200);
    const context = text.slice(contextStart, contextEnd);

    // Common reward patterns
    const rewardPatterns = [
      /(\\d+)\\s*golden keys?/i,
      /(\\d+)\\s*diamond keys?/i,
      /legendary weapon/i,
      /eridium bundle/i,
      /skin pack/i,
      /cosmetic/i
    ];

    for (const pattern of rewardPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Gaming reward';
  }

  private async saveExtractedCodes(codes: any[], post: RedditPost) {
    const savedCodes: any[] = [];

    for (const extractedCode of codes) {
      try {
        // Check if code already exists
        const existingCode = await prisma.shiftCode.findUnique({
          where: { code: extractedCode.code }
        });

        if (existingCode) {
          console.log(`   ⏭️  Code ${extractedCode.code} already exists, skipping`);
          continue;
        }

        // Create new code with transaction
        const newCode = await prisma.$transaction(async (tx) => {
          const code = await tx.shiftCode.create({
            data: {
              code: extractedCode.code,
              rewardDescription: extractedCode.description || 'Gaming reward',
              status: 'active',
              sourceUrl: `https://reddit.com${post.permalink}`,
              sourceId: post.id,
              notes: `Auto-imported from Reddit r/Borderlands`,
              createdById: 'cmg3vi9dq0000ro96mlbbwcjw' // Use existing admin user
            }
          });

          // Create platform associations
          const platformData = extractedCode.platforms.map((platform: string) => ({
            codeId: code.id,
            platform
          }));

          await tx.codePlatform.createMany({
            data: platformData
          });

          return code;
        });

        savedCodes.push(newCode);
        console.log(`   ✅ Saved new code: ${extractedCode.code} - ${extractedCode.description}`);

      } catch (error) {
        console.error(`   ❌ Failed to save code ${extractedCode.code}:`, error);
      }
    }

    return savedCodes;
  }

  async searchForCodes() {
    try {
      console.log('🔍 Searching r/Borderlands for shift codes...');

      const response = await this.httpClient.get<RedditResponse>('/r/Borderlands/search', {
        params: {
          q: 'codes OR "shift codes" OR "BL4"',
          restrict_sr: 1,
          sort: 'new',
          t: 'week',
          limit: 25
        }
      });

      const posts = response.data.data.children;
      console.log(`📊 Found ${posts.length} recent posts with code-related keywords`);

      let totalNewCodes = 0;

      for (const post of posts) {
        const postData = post.data;
        console.log(`\\n📑 Processing post: "${postData.title}"`);
        console.log(`   👤 Author: u/${postData.author}`);
        console.log(`   📊 Score: ${postData.score}, Comments: ${postData.num_comments}`);
        console.log(`   🕐 Posted: ${new Date(postData.created_utc * 1000).toLocaleString()}`);

        // Extract codes from post
        const extractedCodes = this.extractCodesFromPost(postData);

        if (extractedCodes.length > 0) {
          console.log(`   🎮 Found ${extractedCodes.length} shift code(s):`);
          extractedCodes.forEach(code => {
            console.log(`      - ${code.code} (${code.platforms.join(', ')})`);
          });

          // Save codes to database
          const savedCodes = await this.saveExtractedCodes(extractedCodes, postData);
          totalNewCodes += savedCodes.length;
        } else {
          console.log('   ℹ️  No shift codes found in this post');
        }
      }

      console.log(`\\n🎉 Reddit monitoring complete!`);
      console.log(`📊 Summary:`);
      console.log(`   - Posts processed: ${posts.length}`);
      console.log(`   - New codes added: ${totalNewCodes}`);

      return {
        success: true,
        postsProcessed: posts.length,
        newCodes: totalNewCodes
      };

    } catch (error: any) {
      console.error('❌ Reddit search failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async start() {
    try {
      console.log('🚀 Starting Real Reddit Monitoring\\n');

      // Authenticate first
      await this.authenticate();

      // Search for codes
      const result = await this.searchForCodes();

      if (result.newCodes > 0) {
        console.log('\\n🔄 New codes found! Frontend will show updated data.');
        console.log('   Frontend: http://localhost:4321');
        console.log('   API: http://localhost:3000/api/v1/codes');
      }

      return result;

    } catch (error: any) {
      console.error('❌ Real Reddit monitoring failed:', error);
      throw error;
    }
  }
}

// Run the real monitoring
async function runRealRedditMonitoring() {
  const monitor = new RealRedditMonitor();
  return await monitor.start();
}

// Check if required environment variables are set
const requiredEnvVars = [
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD',
  'REDDIT_USER_AGENT'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env file and configure Reddit API credentials.');
  process.exit(1);
}

// Only run if called directly
if (require.main === module) {
  runRealRedditMonitoring()
    .then(result => {
      console.log('\\n✅ Monitoring completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n❌ Monitoring failed:', error.message);
      process.exit(1);
    });
}

export { runRealRedditMonitoring };