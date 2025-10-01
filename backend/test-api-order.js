const fetch = require('node-fetch');

async function testApiOrder() {
  try {
    const response = await fetch('http://localhost:3006/api/v1/codes');
    const data = await response.json();

    if (data.success && data.data && data.data.codes) {
      console.log('Top 5 codes in API response:');
      console.log('=====================================');

      data.data.codes.slice(0, 5).forEach((code, index) => {
        const isReddit = (code.sourceUrl && code.sourceUrl.includes('reddit')) || (code.notes && code.notes.includes('Reddit'));
        console.log(`${index + 1}. ${code.code} - Reddit: ${isReddit ? 'YES' : 'NO'} - Source: ${code.sourceUrl || 'N/A'}`);
      });

      // Count Reddit codes
      const redditCount = data.data.codes.filter(code =>
        (code.sourceUrl && code.sourceUrl.includes('reddit')) || (code.notes && code.notes.includes('Reddit'))
      ).length;

      console.log(`\nTotal Reddit codes: ${redditCount}/${data.data.codes.length}`);
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testApiOrder();