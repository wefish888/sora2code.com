import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  // Extract frontmatter and body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (frontmatterMatch) {
    const [, frontmatter, body] = frontmatterMatch;

    // Parse frontmatter lines
    const lines = frontmatter.split('\n');
    const fixedLines = lines.map(line => {
      // Fix title line
      if (line.startsWith('title: ')) {
        const titleContent = line.substring(7).trim();
        // Remove quotes if they exist and re-add them properly
        const cleanTitle = titleContent.replace(/^"|"$/g, '');
        return `title: "${cleanTitle}"`;
      }

      // Fix description line
      if (line.startsWith('description: ')) {
        const descContent = line.substring(13).trim();
        // Remove quotes if they exist and re-add them properly
        const cleanDesc = descContent.replace(/^"|"$/g, '');
        return `description: "${cleanDesc}"`;
      }

      // Fix category line
      if (line.startsWith('category: ')) {
        const categoryContent = line.substring(10).trim();
        // Remove quotes if they exist and re-add them properly
        const cleanCategory = categoryContent.replace(/^"|"$/g, '');
        return `category: "${cleanCategory}"`;
      }

      return line;
    });

    const newFrontmatter = fixedLines.join('\n');
    const newContent = `---\n${newFrontmatter}\n---\n${body}`;

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed frontmatter in: ${filename}`);
    }
  }
});

console.log(`Processed ${files.length} files`);