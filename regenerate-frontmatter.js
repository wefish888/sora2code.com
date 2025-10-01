import fs from 'fs';
import path from 'path';

const blogDir = 'src/content/blog';
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));

files.forEach(filename => {
  const filePath = path.join(blogDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract body (everything after the first frontmatter block)
  const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
  const body = bodyMatch ? bodyMatch[1] : content;

  // Extract title from first h1 in body
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '').replace(/-/g, ' ');

  // Extract description from first paragraph
  const descMatch = body.match(/^(?!#)(.{100,300})\./m);
  const description = descMatch ? descMatch[1].trim() + '.' : `Complete guide for ${title}`;

  // Generate category and tags based on filename
  const baseName = filename.replace('.md', '');
  let category = 'guides';
  const tags = ['borderlands-4', 'bl4', 'gaming', 'guide'];

  if (baseName.includes('weapon') || baseName.includes('slugger') || baseName.includes('legendary') || baseName.includes('farm')) {
    category = 'weapons';
    tags.push('weapons');
  }
  if (baseName.includes('level') || baseName.includes('rank') || baseName.includes('uvhm') || baseName.includes('increase')) {
    category = 'leveling';
    tags.push('leveling');
  }
  if (baseName.includes('farm') || baseName.includes('where') || baseName.includes('get')) {
    tags.push('farming');
  }
  if (baseName.includes('quest') || baseName.includes('mission') || baseName.includes('do-')) {
    category = 'quests';
    tags.push('quests');
  }

  // Create clean frontmatter
  const frontmatter = `---
title: "${title}"
description: "${description.substring(0, 200)}"
pubDate: 2024-09-30T00:00:00.000Z
category: "${category}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
featured: false
---

`;

  const newContent = frontmatter + body;
  fs.writeFileSync(filePath, newContent);
  console.log(`Regenerated frontmatter for: ${filename}`);
});

console.log(`Processed ${files.length} files`);