import fs from 'fs';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  tags: string[];
  publishedAt: string;
  coverImage?: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    meta[key] = value;
  }
  return { meta, content: match[2].trim() };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  // Support both "tag1, tag2" and "[tag1, tag2]"
  const cleaned = raw.replace(/^\[|\]$/g, '');
  return cleaned.split(',').map((t) => t.trim()).filter(Boolean);
}

export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { meta, content } = parseFrontmatter(raw);

  if (!meta.title) return null;

  return {
    slug,
    title: meta.title,
    excerpt: meta.excerpt ?? '',
    author: meta.author ?? 'WeightLoss Team',
    tags: parseTags(meta.tags),
    publishedAt: meta.publishedAt ?? meta.date ?? '',
    coverImage: meta.coverImage,
    content,
  };
}

export function getAllBlogPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));
  const posts: BlogPostMeta[] = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const post = getBlogPost(slug);
    if (!post) continue;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content, ...meta } = post;
    posts.push(meta);
  }

  // Sort by publishedAt descending
  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getRelatedPosts(currentSlug: string, tags: string[]): BlogPostMeta[] {
  const all = getAllBlogPosts();
  const others = all.filter((p) => p.slug !== currentSlug);
  const scored = others.map((post) => ({
    post,
    score: post.tags.filter((t) => tags.includes(t)).length,
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.post);
}
