import { prisma } from './src/utils/database';

// Mock Reddit posts with shift codes for demonstration
const mockRedditPosts = [
  {
    id: 'mock_post_1',
    title: '🎮 New BL4 Shift Codes - Limited Time Golden Keys!',
    selftext: 'Hey vault hunters! New shift codes just dropped:\n\nGOLD5-KEYSZ-FORBL-4GAME-ENJOY - 5 Golden Keys\nDIAMD-KEYSX-NEWBL-4CODE-AWESOME - 3 Diamond Keys\n\nThese work on all platforms (PC, Xbox, PlayStation). Grab them while they\'re hot!',
    author: 'GearboxOfficial',
    score: 256,
    num_comments: 42,
    created_utc: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    permalink: '/r/Borderlands/comments/mock1/new_bl4_shift_codes/'
  },
  {
    id: 'mock_post_2',
    title: 'PSA: Working Shift Code for PC Players',
    selftext: 'Found this working code:\nPCONL-YCODE-FORPC-USERS-ONLYY - Legendary Weapon\n\nPC only unfortunately, but confirmed working!',
    author: 'VaultHunter123',
    score: 89,
    num_comments: 15,
    created_utc: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    permalink: '/r/Borderlands/comments/mock2/psa_working_shift_code/'
  },
  {
    id: 'mock_post_3',
    title: 'Weekly sora2 Discussion Thread',
    selftext: 'General discussion about BL4. Share your experiences!\n\nAlso, here\'s a code I found: WEEKL-YDISC-USSIO-NCODE-SHARE - Eridium Bundle',
    author: 'ModeratorBot',
    score: 45,
    num_comments: 78,
    created_utc: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    permalink: '/r/Borderlands/comments/mock3/weekly_discussion/'
  }
];

class MockRedditMonitor {
  private extractCodesFromPost(post: any) {
    const text = `${post.title} ${post.selftext}`;
    const codes: Array<{code: string, description?: string, platforms: string[]}> = [];

    // Extract shift codes pattern
    const codePattern = /\b([A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5})\b/gi;
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
      /(\d+)\s*golden keys?/i,
      /(\d+)\s*diamond keys?/i,
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

  private async saveExtractedCodes(codes: any[], post: any) {
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
              notes: `Auto-imported from Reddit r/Borderlands (Mock Demo)`,
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

  async simulateRedditMonitoring() {
    console.log('🤖 Starting Mock Reddit Monitoring Demo\n');

    try {
      let totalNewCodes = 0;

      for (const post of mockRedditPosts) {
        console.log(`📑 Processing post: "${post.title}"`);
        console.log(`   👤 Author: u/${post.author}`);
        console.log(`   📊 Score: ${post.score}, Comments: ${post.num_comments}`);
        console.log(`   🕐 Posted: ${new Date(post.created_utc * 1000).toLocaleString()}`);

        // Extract codes from post
        const extractedCodes = this.extractCodesFromPost(post);

        if (extractedCodes.length > 0) {
          console.log(`   🎮 Found ${extractedCodes.length} shift code(s):`);
          extractedCodes.forEach(code => {
            console.log(`      - ${code.code} (${code.platforms.join(', ')})`);
          });

          // Save codes to database
          const savedCodes = await this.saveExtractedCodes(extractedCodes, post);
          totalNewCodes += savedCodes.length;
        } else {
          console.log('   ℹ️  No shift codes found in this post');
        }

        console.log(''); // Empty line for readability
      }

      console.log(`🎉 Mock monitoring complete!`);
      console.log(`📊 Summary:`);
      console.log(`   - Posts processed: ${mockRedditPosts.length}`);
      console.log(`   - New codes added: ${totalNewCodes}`);

      if (totalNewCodes > 0) {
        console.log('\n🔄 You can now refresh your frontend to see the new codes!');
        console.log('   Frontend: http://localhost:4321');
        console.log('   API: http://localhost:3000/api/v1/codes');
      }

    } catch (error) {
      console.error('❌ Mock monitoring failed:', error);
      throw error;
    }
  }
}

// Run the simulation
async function runMockMonitoring() {
  const monitor = new MockRedditMonitor();
  await monitor.simulateRedditMonitoring();
}

runMockMonitoring().catch(console.error);