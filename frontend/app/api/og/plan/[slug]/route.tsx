import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import {
  DIET_TYPES,
  GOAL_TYPES,
  buildPseoH1,
  type DietType,
  type GoalType,
} from '@/lib/seo/pseo-combinations';

export const runtime = 'edge';

function parseDims(slug: string): { goalType: GoalType; dietType?: DietType } | null {
  let remaining = slug;
  let goalType: GoalType | undefined;
  let dietType: DietType | undefined;

  for (const g of GOAL_TYPES) {
    if (remaining.startsWith(g)) {
      goalType = g;
      remaining = remaining.slice(g.length).replace(/^-/, '');
      break;
    }
  }
  if (!goalType) return null;

  for (const d of DIET_TYPES) {
    if (remaining === d || remaining.startsWith(d)) {
      dietType = d;
      break;
    }
  }

  return { goalType, dietType };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dims = parseDims(slug);
  const headline = dims ? buildPseoH1(dims) : 'AI Weight Loss Plan';

  const dietLabel = dims?.dietType
    ? dims.dietType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

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
            {dietLabel ?? 'Personalised Plan'}
          </div>
          <div style={{ fontSize: 16, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
            AI Metabolic Coach
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: headline.length > 50 ? 44 : 52,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            maxWidth: '800px',
          }}
        >
          {headline}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 20, color: '#94a3b8' }}>
            Science-backed · AI-optimised · Free to start
          </div>
          <div
            style={{
              background: '#3b82f6',
              borderRadius: '12px',
              padding: '10px 28px',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Get your plan →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
