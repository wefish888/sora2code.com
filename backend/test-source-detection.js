const fetch = require('node-fetch');

async function testSourceDetection() {
  try {
    const response = await fetch('http://localhost:3006/api/v1/codes');
    const data = await response.json();

    if (data.success && data.data && data.data.codes) {
      console.log('Source Detection Test:');
      console.log('====================');

      data.data.codes.slice(0, 10).forEach((code, index) => {
        const isReddit = code.sourceUrl && code.sourceUrl.includes('reddit');
        const sourceType = isReddit ? 'Reddit' : 'Official/Other';

        console.log(`${index + 1}. Code: ${code.code}`);
        console.log(`   Source URL: ${code.sourceUrl || 'N/A'}`);
        console.log(`   Source Type: ${sourceType}`);
        console.log(`   Status: ${code.status}`);
        console.log(`   Expires At: ${code.expiresAt || 'Never'}`);
        console.log('');
      });

      // Count by source type
      const redditCodes = data.data.codes.filter(code =>
        code.sourceUrl && code.sourceUrl.includes('reddit')
      ).length;

      const officialCodes = data.data.codes.filter(code =>
        code.sourceUrl && !code.sourceUrl.includes('reddit')
      ).length;

      console.log(`Summary:`);
      console.log(`Reddit codes: ${redditCodes}`);
      console.log(`Official/Other codes: ${officialCodes}`);
      console.log(`Total codes: ${data.data.codes.length}`);
    }
  } catch (error) {
    console.error('Error testing source detection:', error.message);
  }
}

testSourceDetection();