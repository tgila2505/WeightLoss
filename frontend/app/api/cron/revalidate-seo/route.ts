import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const SEO_TAGS = ['seo-pages', 'blog-posts', 'ugc-pages', 'sitemap'] as const

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  for (const tag of SEO_TAGS) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: true, tags: SEO_TAGS })
}
