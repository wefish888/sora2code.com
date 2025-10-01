import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];

    try {
      yaml.parse(frontmatterText);
    } catch (error) {
      console.log(`YAML Error in ${filename}: ${error.message}`);

      // Try to fix common issues
      let fixedFrontmatter = frontmatterText;

      // Fix unescaped quotes in titles and descriptions
      fixedFrontmatter = fixedFrontmatter.replace(
        /(title|description):\s*"([^"]*)"([^"]*)"([^"]*)"([^"]*)/g,
        (match, field, part1, part2, part3, part4) => {
          // Replace inner quotes with escaped quotes
          const fixedValue = `${part1}\\"${part2}\\"${part3}${part4 ? part4 : ''}`;
          return `${field}: "${fixedValue}"`;
        }
      );

      // Try to parse again
      try {
        yaml.parse(fixedFrontmatter);

        // If successful, write the fixed version
        const newContent = content.replace(frontmatterMatch[1], fixedFrontmatter);
        fs.writeFileSync(filePath, newContent);
        console.log(`Fixed YAML in: ${filename}`);
      } catch (error2) {
        console.log(`Could not fix ${filename}: ${error2.message}`);
      }
    }
  }
});

console.log(`Validated ${files.length} files`);