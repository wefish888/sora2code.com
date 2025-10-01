import { runRealRedditMonitoring } from './real-reddit-monitor';

async function testRealRedditMonitoring() {
  console.log('🚀 Testing Real Reddit Monitoring Integration\n');

  try {
    // Check if Reddit monitoring is enabled
    if (process.env.ENABLE_REDDIT_MONITORING !== 'true') {
      console.log('❌ Reddit monitoring is disabled');
      console.log('   Set ENABLE_REDDIT_MONITORING=true in .env to enable this feature');
      return;
    }

    // Check if required environment variables are set
    const requiredEnvVars = [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_USER_AGENT',
      'REDDIT_USERNAME',
      'REDDIT_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log('❌ Missing Reddit API credentials:', missingVars);
      console.log('   Please configure all Reddit API credentials in .env file');
      return;
    }

    console.log('✅ All Reddit API credentials are configured');
    console.log('✅ Reddit monitoring is enabled');
    console.log('\n🔄 Starting real Reddit monitoring...\n');

    // Run real Reddit monitoring
    const result = await runRealRedditMonitoring();

    console.log('\n🎉 Real Reddit monitoring test completed!');
    console.log('📊 Results:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Posts processed: ${result.postsProcessed}`);
    console.log(`   - New codes found: ${result.newCodes}`);

    if (result.newCodes > 0) {
      console.log('\n✨ New shift codes were found and added to the database!');
      console.log('   Check the frontend at http://localhost:4321 to see them');
      console.log('   Or API at http://localhost:3000/api/v1/codes');
    } else {
      console.log('\n💡 No new codes found this time - this is normal if codes were recently checked');
    }

  } catch (error: any) {
    console.error('\n❌ Real Reddit monitoring test failed:');
    console.error(`   Error: ${error.message}`);

    if (error.response?.status === 403) {
      console.error('   🚫 Reddit API access was blocked (network policy)');
      console.error('   💡 This may work in a different network environment');
    } else if (error.response?.status === 401) {
      console.error('   🔐 Authentication failed - check Reddit credentials');
    } else if (error.response?.status === 429) {
      console.error('   ⏱️  Rate limit exceeded - try again later');
    }
  }
}

// Run the test
testRealRedditMonitoring()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });