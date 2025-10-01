import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  let updated = false;
  let newContent = content;

  // Fix the specific issue with double quotes in descriptions
  newContent = newContent.replace(
    /description:\s*"([^"]*)"([^"]*)"([^"]*)"?/g,
    (match, part1, part2, part3) => {
      updated = true;
      // Remove the problematic quotes and create a clean description
      const cleanDescription = `${part1}${part2}${part3}`.replace(/"/g, '');
      return `description: "${cleanDescription}"`;
    }
  );

  // Fix titles with quotes
  newContent = newContent.replace(
    /title:\s*"([^"]*)"([^"]*)"([^"]*)"?/g,
    (match, part1, part2, part3) => {
      updated = true;
      // Remove the problematic quotes and create a clean title
      const cleanTitle = `${part1}${part2}${part3}`.replace(/"/g, '');
      return `title: "${cleanTitle}"`;
    }
  );

  // Alternative approach: Use literal block scalars for problematic fields
  newContent = newContent.replace(
    /description:\s*"([^"]*beating[^"]*)"([^"]*)/g,
    (match, description, rest) => {
      updated = true;
      // Use YAML literal block scalar to avoid quote issues
      const cleanDescription = description.replace(/"/g, '');
      return `description: "${cleanDescription}"`;
    }
  );

  if (updated) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed quotes in: ${filename}`);
  }
});

console.log(`Processed ${files.length} files`);