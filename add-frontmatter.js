import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has frontmatter
  if (content.startsWith('---')) {
    return;
  }

  // Extract title from first h1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : filename.replace('.md', '').replace(/-/g, ' ');

  // Extract description from first paragraph
  const descMatch = content.match(/^(?!#)(.{50,200})\./m);
  const description = descMatch ? descMatch[1].trim() + '.' : `Complete guide for ${title}`;

  // Generate tags based on filename
  const baseName = filename.replace('.md', '');
  const tags = ['borderlands-4', 'bl4', 'gaming', 'guide'];

  if (baseName.includes('weapon') || baseName.includes('slugger') || baseName.includes('legendary')) {
    tags.push('weapons');
  }
  if (baseName.includes('level') || baseName.includes('rank') || baseName.includes('uvhm')) {
    tags.push('leveling');
  }
  if (baseName.includes('farm') || baseName.includes('get') || baseName.includes('where')) {
    tags.push('farming');
  }
  if (baseName.includes('quest') || baseName.includes('mission')) {
    tags.push('quests');
  }

  // Determine category
  let category = 'guides';
  if (baseName.includes('weapon') || baseName.includes('slugger') || baseName.includes('legendary')) {
    category = 'weapons';
  } else if (baseName.includes('level') || baseName.includes('uvhm') || baseName.includes('rank')) {
    category = 'leveling';
  } else if (baseName.includes('farm') || baseName.includes('where')) {
    category = 'farming';
  } else if (baseName.includes('quest') || baseName.includes('mission')) {
    category = 'quests';
  }

  const frontmatter = `---
title: "${title}"
description: "${description}"
pubDate: 2024-09-30
category: "${category}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
featured: false
---

`;

  const newContent = frontmatter + content;
  fs.writeFileSync(filePath, newContent);
  console.log(`Added frontmatter to: ${filename}`);
});

console.log(`Processed ${files.length} files`);