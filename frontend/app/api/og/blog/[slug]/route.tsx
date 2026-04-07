import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Derive a human-readable title from the slug as fallback
  const titleFromSlug = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          padding: '60px 64px',
          fontFamily: 'sans-serif',
          justifyContent: 'space-between',
        }}
      >
        {/* Top label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: '#3b82f6',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Blog
          </div>
          <div style={{ fontSize: 16, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
            WeightLoss App
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: titleFromSlug.length > 60 ? 40 : 48,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            maxWidth: '860px',
          }}
        >
          {titleFromSlug}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 18, color: '#94a3b8' }}>
            Science-backed weight loss guidance
          </div>
          <div
            style={{
              background: '#3b82f6',
              borderRadius: '12px',
              padding: '10px 28px',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Read article →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
