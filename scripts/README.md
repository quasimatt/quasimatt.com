# Scripts

## generate-posts.js

Node.js script that scans the repository for Markdown/HTML blog posts and extracts Twitter handles to create `posts.json` for the social graph visualization.

### Prerequisites

```bash
npm install gray-matter
```

### Usage

```bash
node scripts/generate-posts.js [options]
```

### Options

- `--out` - Output file path (default: `social/posts.json`)
- `--paths` - Comma-separated list of directories to scan (default: `posts,_posts,content/posts,content/blog,src/posts`)
- `--since` - ISO date string, only include posts on or after this date (default: `2025-09-22`)

### Examples

```bash
# Generate posts.json with default settings
node scripts/generate-posts.js

# Specify custom paths and output
node scripts/generate-posts.js --paths "blog,articles" --out "data/posts.json"

# Include posts from a different date
node scripts/generate-posts.js --since "2024-01-01"
```

### How it works

1. Recursively scans specified directories for `.md`, `.mdx`, and `.html` files
2. Parses YAML frontmatter if present to get:
   - `date` - Post date
   - `handles` - Array of Twitter handles (optional)
   - `id` - Post ID
   - `title` - Post title
3. If handles are not in frontmatter, scans file content for Twitter handles using regex `/@([A-Za-z0-9_]{1,15})/g`
4. Uses frontmatter date if present, otherwise uses file's modification time
5. Filters posts to only include those on or after the `--since` date
6. Outputs JSON array with objects: `{ id, path, date, title, handles }`

### Output format

```json
[
  {
    "id": "post-id",
    "path": "posts/my-post.md",
    "date": "2025-10-29T00:00:00.000Z",
    "title": "My Post Title",
    "handles": ["@user1", "@user2"]
  }
]
```
