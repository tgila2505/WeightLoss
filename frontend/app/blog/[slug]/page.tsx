import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllBlogPosts, getBlogPost, getRelatedPosts } from '@/lib/content/blog'
import { buildArticleMetadata } from '@/lib/seo/metadata'
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/seo/schema'
import { MarkdownContent } from './markdown-content'

export const revalidate = 86400 // 24 hours

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  const base = buildArticleMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    publishedAt: post.publishedAt,
    author: post.author,
    tags: post.tags,
  })

  const schema = buildArticleSchema({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    publishedAt: post.publishedAt,
    author: post.author,
  })

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ]

  return {
    ...base,
    openGraph: { ...base.openGraph, images: [{ url: `/api/og/blog/${slug}`, width: 1200, height: 630, alt: post.title }] },
    twitter: { ...base.twitter, images: [`/api/og/blog/${slug}`] },
    other: {
      'script:ld+json': [
        JSON.stringify(schema),
        JSON.stringify(buildBreadcrumbSchema(breadcrumbs)),
      ],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return notFound()

  const related = getRelatedPosts(slug, post.tags)

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-blue-600 transition-colors">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">{crumb.name}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
          <span>{post.author}</span>
          {post.publishedAt && (
            <>
              <span>·</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </>
          )}
        </div>

        {/* Content */}
        <MarkdownContent content={post.content} />

        {/* Related pSEO plans */}
        <section className="mt-14 pt-8 border-t border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Personalised plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {post.tags.slice(0, 4).map((tag) => {
              const slugified = tag.toLowerCase().replace(/\s+/g, '-')
              return (
                <Link
                  key={tag}
                  href={`/plan/lose-weight-${slugified}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    Lose weight on {tag}
                  </span>
                  <span className="text-slate-300 group-hover:text-blue-400 ml-2">→</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Related articles</h2>
            <div className="space-y-3">
              {related.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                      {rp.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{rp.excerpt}</p>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-400 ml-4 flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 bg-slate-900 rounded-2xl px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Ready to build your personalised plan?
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Answer 3 questions and get an AI-optimised calorie and macro target built for your body.
          </p>
          <Link
            href="/funnel"
            className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-500 text-white hover:bg-blue-400 transition-colors"
          >
            Start for free →
          </Link>
        </section>
      </article>
    </main>
  )
}
