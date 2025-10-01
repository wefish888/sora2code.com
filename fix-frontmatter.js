import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  // Fix pubDate format
  const updatedContent = content.replace(
    /pubDate: 2024-09-30/,
    'pubDate: 2024-09-30T00:00:00.000Z'
  );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Fixed pubDate in: ${filename}`);
  }
});

console.log(`Processed ${files.length} files`);