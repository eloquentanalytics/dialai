#!/usr/bin/env node

/**
 * Sync script to update website/src/data/constitution.ts from CONSTITUTION.md
 * 
 * This script reads the markdown file and updates the TypeScript export file
 * to keep them in sync.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const markdownPath = path.join(rootDir, 'CONSTITUTION.md');
const tsPath = path.join(rootDir, 'website/src/data/constitution.ts');

try {
  // Read the markdown file
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  
  // Escape backticks and template literal syntax
  const escapedContent = markdownContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
  
  // Generate the TypeScript file content
  const tsContent = `// This file exports the constitution markdown content
// It's generated from CONSTITUTION.md in the project root
// 
// NOTE: This file is auto-generated. Do not edit manually.
// Run: node website/scripts/sync-constitution.js
// Or: npm run sync-constitution (if added to package.json)
export const constitutionMarkdown = \`${escapedContent}\`;
`;

  // Write the TypeScript file
  fs.writeFileSync(tsPath, tsContent, 'utf8');
  
  console.log('✅ Successfully synced CONSTITUTION.md to website/src/data/constitution.ts');
} catch (error) {
  console.error('❌ Error syncing constitution:', error.message);
  process.exit(1);
}
