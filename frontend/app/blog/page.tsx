import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/content/blog'
import { buildMetadata } from '@/lib/seo/metadata'

export const revalidate = 86400 // 24 hours

export const metadata: Metadata = buildMetadata({
  title: 'Weight Loss Blog — Tips, Science & Success Stories',
  description:
    'Science-backed articles on fat loss, nutrition, calorie tracking, and behaviour change from the WeightLoss App team.',
  path: '/blog',
})

const ALL_TAG = 'All'

export default function BlogIndexPage() {
  const posts = getAllBlogPosts()

  const allTags = Array.from(
    new Set(posts.flatMap((p) => p.tags)),
  ).sort()

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            WeightLoss Blog
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Tips, Science &amp; Success Stories
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            Evidence-based guides on fat loss, nutrition, calorie tracking, and lasting habit change.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
              {ALL_TAG}
            </span>
            {allTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Post grid */}
        {posts.length === 0 ? (
          <p className="text-slate-400 text-center py-16">No posts yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-500 line-clamp-3 flex-1">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-3 border-t border-slate-100">
                    <span>{post.author}</span>
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
