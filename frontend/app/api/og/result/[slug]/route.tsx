import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Parse stats from slug: e.g. "john-lost-12kg-in-8-weeks"
  const kgMatch = slug.match(/lost-(\d+)kg/)
  const weeksMatch = slug.match(/in-(\d+)-weeks/)
  const kgLost = kgMatch ? kgMatch[1] : null
  const weeks = weeksMatch ? weeksMatch[1] : null

  const headline = kgLost && weeks
    ? `Lost ${kgLost} kg in ${weeks} weeks`
    : 'Real Weight Loss Result'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e40af 0%, #0f172a 100%)',
          padding: '60px 64px',
          fontFamily: 'sans-serif',
          justifyContent: 'space-between',
        }}
      >
        {/* Top badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Real Result
          </div>
          <div style={{ fontSize: 16, color: '#93c5fd', letterSpacing: 2, textTransform: 'uppercase' }}>
            WeightLoss App
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            {headline}
          </div>
          {kgLost && weeks && (
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: 'kg lost', value: kgLost },
                { label: 'weeks', value: weeks },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '14px 28px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>{value}</span>
                  <span style={{ fontSize: 14, color: '#93c5fd', marginTop: 4 }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 18, color: '#93c5fd' }}>
            Could this be you?
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
            Get my free plan →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
