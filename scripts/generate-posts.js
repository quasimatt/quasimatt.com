#!/usr/bin/env node

/**
 * generate-posts.js
 * 
 * Scans the repository for Markdown/HTML blog posts and extracts Twitter handles
 * to create posts.json for the social graph visualization.
 * 
 * Requirements:
 * - Run `npm install gray-matter` before running this script
 * 
 * Usage:
 *   node scripts/generate-posts.js [options]
 * 
 * Options:
 *   --out       Output file path (default: "social/posts.json")
 *   --paths     Comma-separated list of directories to scan (default: "posts,_posts,content/posts,content/blog,src/posts")
 *   --since     ISO date string, only include posts on or after this date (default: "2025-09-22")
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    out: 'social/posts.json',
    paths: 'posts,_posts,content/posts,content/blog,src/posts',
    since: '2025-09-22'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && i + 1 < args.length) {
      options.out = args[++i];
    } else if (args[i] === '--paths' && i + 1 < args.length) {
      options.paths = args[++i];
    } else if (args[i] === '--since' && i + 1 < args.length) {
      options.since = args[++i];
    }
  }

  return options;
}

// Recursively find files with given extensions in a directory
function findFiles(dir, extensions, results = []) {
  if (!fs.existsSync(dir)) {
    return results;
  }

  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, extensions, results);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Extract Twitter handles from text using regex
function extractHandles(text) {
  const handleRegex = /@([A-Za-z0-9_]{1,15})/g;
  const handles = new Set();
  let match;
  
  while ((match = handleRegex.exec(text)) !== null) {
    handles.add('@' + match[1]);
  }
  
  return Array.from(handles);
}

// Parse a single file and extract post data
function parseFile(filePath, sinceDate) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    // Parse frontmatter if present
    let parsed;
    try {
      parsed = matter(content);
    } catch (e) {
      // If frontmatter parsing fails, treat entire content as body
      parsed = { data: {}, content: content };
    }
    
    const frontmatter = parsed.data;
    const body = parsed.content;
    
    // Extract handles from frontmatter or scan content
    let handles = [];
    if (frontmatter.handles && Array.isArray(frontmatter.handles)) {
      handles = frontmatter.handles;
    } else {
      // Scan both frontmatter and body for Twitter handles
      const allText = JSON.stringify(frontmatter) + '\n' + body;
      handles = extractHandles(allText);
    }
    
    // Get date from frontmatter or file mtime
    let postDate;
    if (frontmatter.date) {
      postDate = new Date(frontmatter.date);
    } else {
      postDate = new Date(stats.mtime);
    }
    
    // Filter by since date
    if (postDate < sinceDate) {
      return null;
    }
    
    // Get id and title
    const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
    const title = frontmatter.title || id;
    
    return {
      id,
      path: filePath,
      date: postDate.toISOString(),
      title,
      handles
    };
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error.message);
    return null;
  }
}

// Main function
function main() {
  const options = parseArgs();
  const sinceDate = new Date(options.since);
  const searchPaths = options.paths.split(',').map(p => p.trim());
  const extensions = ['.md', '.mdx', '.html'];
  
  console.log('Scanning for posts...');
  console.log(`  Paths: ${searchPaths.join(', ')}`);
  console.log(`  Since: ${options.since}`);
  console.log(`  Output: ${options.out}`);
  
  // Find all files
  const allFiles = [];
  for (const searchPath of searchPaths) {
    findFiles(searchPath, extensions, allFiles);
  }
  
  console.log(`Found ${allFiles.length} files to process`);
  
  // Parse files and extract post data
  const posts = [];
  for (const filePath of allFiles) {
    const post = parseFile(filePath, sinceDate);
    if (post && post.handles.length > 0) {
      posts.push(post);
    }
  }
  
  console.log(`Extracted ${posts.length} posts with Twitter handles`);
  
  // Sort by date (most recent first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Write output
  const outputDir = path.dirname(options.out);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(options.out, JSON.stringify(posts, null, 2));
  
  console.log(`\nSuccess! Written ${posts.length} posts to ${options.out}`);
  
  // Print summary statistics
  const uniqueHandles = new Set();
  posts.forEach(post => post.handles.forEach(h => uniqueHandles.add(h)));
  console.log(`  Unique Twitter handles: ${uniqueHandles.size}`);
  console.log(`  Date range: ${posts[posts.length - 1]?.date} to ${posts[0]?.date}`);
}

// Run main function
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { parseFile, extractHandles, findFiles };
