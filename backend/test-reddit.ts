import axios from 'axios';

async function testRedditConnection() {
  console.log('🔍 Testing Reddit API connection...\n');

  try {
    // Test basic Reddit API access (no authentication required for public data)
    const httpClient = axios.create({
      baseURL: 'https://www.reddit.com',
      timeout: 10000,
      headers: {
        'User-Agent': 'sora2code/1.0.0 (https://sora2code.com)',
        'Accept': 'application/json'
      }
    });

    // Test 1: Get recent posts (this usually works without auth)
    console.log('📊 Testing basic subreddit access...');

    // Try the new.json endpoint first as it's more accessible
    let subredditResponse: any;
    try {
      subredditResponse = await httpClient.get('/r/Borderlands/new.json?limit=1');
      console.log(`✅ Successfully connected to r/Borderlands`);
      console.log(`   - Can access public posts`);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('⚠️  Direct subreddit access blocked (this is normal)');
        console.log('   - Trying alternative access method...');

        // Try a more generic approach
        subredditResponse = await httpClient.get('/r/all/new.json?limit=1');
        console.log('✅ Alternative access method works');
      } else {
        throw error;
      }
    }

    console.log(`   - Response status: ${subredditResponse?.status || 'N/A'}`);

    // Test 2: Search for posts
    console.log('🔍 Testing search functionality...');
    const searchResponse = await httpClient.get('/r/Borderlands/search.json', {
      params: {
        q: 'codes OR "shift codes"',
        restrict_sr: 1,
        sort: 'new',
        t: 'week',
        limit: 5
      }
    });

    const posts = searchResponse.data.data.children;
    console.log(`✅ Found ${posts.length} recent posts with code-related keywords`);

    posts.forEach((post: any, index: number) => {
      const data = post.data;
      console.log(`   ${index + 1}. "${data.title}" by u/${data.author}`);
      console.log(`      Posted: ${new Date(data.created_utc * 1000).toLocaleDateString()}`);
      console.log(`      Score: ${data.score}, Comments: ${data.num_comments}`);
    });

    // Test 3: Check for actual shift codes in recent posts
    console.log('\n🎮 Checking for shift codes in content...');
    const codePattern = /\b([A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5})\b/gi;
    let codesFound = 0;

    for (const post of posts) {
      const text = `${post.data.title} ${post.data.selftext}`;
      const matches = text.match(codePattern);

      if (matches) {
        codesFound += matches.length;
        console.log(`   📋 Found ${matches.length} code(s) in: "${post.data.title}"`);
        matches.forEach((code: string) => {
          console.log(`      - ${code}`);
        });
      }
    }

    if (codesFound === 0) {
      console.log('   ℹ️  No shift codes found in recent posts (this is normal)');
    }

    console.log('\n🎉 Reddit API connection test completed successfully!');
    console.log('✅ All tests passed - Reddit monitoring is ready to be enabled');

  } catch (error: any) {
    console.error('❌ Reddit API connection test failed:');

    if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error(`   URL: ${error.config?.url}`);

      if (error.response.status === 429) {
        console.error('   ⚠️  Rate limit exceeded - this is normal for frequent testing');
        console.error('   💡 Try again in a few minutes');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   🌐 Network connection failed - check your internet connection');
    } else {
      console.error(`   Error: ${error.message}`);
    }

    process.exit(1);
  }
}

// Run the test
testRedditConnection().catch(console.error);