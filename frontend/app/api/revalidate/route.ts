import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const SEO_TAGS = ['seo-pages', 'blog-posts', 'ugc-pages', 'sitemap']

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET ?? ''

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  for (const tag of SEO_TAGS) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: true, tags: SEO_TAGS })
}
