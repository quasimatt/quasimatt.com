#!/usr/bin/env node

/**
 * Generate posts.json from blog files
 * 
 * Usage:
 *   node scripts/generate-posts.js [--out path] [--paths dir1,dir2] [--since date]
 * 
 * Options:
 *   --out       Output file path (default: social/posts.json)
 *   --paths     Comma-separated directories to scan (default: blog,social,about)
 *   --since     Filter posts on or after this date (default: 2025-09-22)
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
    out: 'social/posts.json',
    paths: ['blog', 'social', 'about'],
    since: '2025-09-22'
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
        config.out = args[++i];
    } else if (args[i] === '--paths' && args[i + 1]) {
        config.paths = args[++i].split(',').map(p => p.trim());
    } else if (args[i] === '--since' && args[i + 1]) {
        config.since = args[++i];
    }
}

// File extensions to scan
const EXTENSIONS = ['.md', '.mdx', '.markdown', '.html'];

/**
 * Extract @handles from text content
 */
function extractHandles(content) {
    const handleRegex = /@(\w+)/g;
    const handles = new Set();
    let match;
    
    while ((match = handleRegex.exec(content)) !== null) {
        handles.add(match[1]);
    }
    
    return Array.from(handles);
}

/**
 * Get file modification time as date string
 */
function getFileMtime(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime.toISOString().split('T')[0];
    } catch (err) {
        return null;
    }
}

/**
 * Process a single file and extract post data
 */
function processFile(filePath, rootDir) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath);
        
        let frontmatter = {};
        let bodyContent = content;
        
        // Parse frontmatter if markdown file
        if (['.md', '.mdx', '.markdown'].includes(ext)) {
            const parsed = matter(content);
            frontmatter = parsed.data;
            bodyContent = parsed.content;
        } else if (ext === '.html') {
            // Try to extract frontmatter from HTML comment
            const fmMatch = content.match(/<!--\s*\n([\s\S]*?)\n-->/);
            if (fmMatch) {
                try {
                    const parsed = matter(`---\n${fmMatch[1]}\n---`);
                    frontmatter = parsed.data;
                } catch (e) {
                    // Ignore frontmatter parsing errors
                }
            }
        }
        
        // Extract data
        const date = frontmatter.date || getFileMtime(filePath);
        const title = frontmatter.title || path.basename(filePath, ext);
        const handles = frontmatter.handles || extractHandles(bodyContent);
        
        // Generate relative path
        const relativePath = path.relative(rootDir, filePath);
        
        // Generate ID from path
        const id = relativePath.replace(/[\/\\]/g, '-').replace(/\.[^.]+$/, '');
        
        return {
            id,
            path: relativePath,
            date,
            title,
            handles: Array.isArray(handles) ? handles : []
        };
    } catch (err) {
        console.error(`Error processing file ${filePath}:`, err.message);
        return null;
    }
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, rootDir) {
    const posts = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                posts.push(...scanDirectory(fullPath, rootDir));
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (EXTENSIONS.includes(ext)) {
                    const post = processFile(fullPath, rootDir);
                    if (post) {
                        posts.push(post);
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Error scanning directory ${dir}:`, err.message);
    }
    
    return posts;
}

/**
 * Main function
 */
function main() {
    const rootDir = process.cwd();
    const sinceDateObj = new Date(config.since);
    
    console.log('Generating posts.json...');
    console.log(`  Output: ${config.out}`);
    console.log(`  Paths: ${config.paths.join(', ')}`);
    console.log(`  Since: ${config.since}`);
    
    // Scan all specified paths
    let allPosts = [];
    for (const dir of config.paths) {
        const fullPath = path.join(rootDir, dir);
        if (fs.existsSync(fullPath)) {
            console.log(`  Scanning: ${dir}`);
            const posts = scanDirectory(fullPath, rootDir);
            allPosts.push(...posts);
        } else {
            console.warn(`  Warning: Directory not found: ${dir}`);
        }
    }
    
    // Filter posts by date
    const filteredPosts = allPosts.filter(post => {
        if (!post.date) return false;
        const postDate = new Date(post.date);
        return postDate >= sinceDateObj;
    });
    
    // Sort by date descending
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Write output
    const outPath = path.join(rootDir, config.out);
    const outDir = path.dirname(outPath);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    fs.writeFileSync(outPath, JSON.stringify(filteredPosts, null, 2));
    
    console.log(`\nGenerated ${filteredPosts.length} posts to ${config.out}`);
}

// Run main function
if (require.main === module) {
    main();
}

module.exports = { extractHandles, processFile, scanDirectory };
