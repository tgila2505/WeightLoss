import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let planSummary = 'A personalised AI weight loss plan';

  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/shared-plans/${slug}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const plan = await res.json();
      const data = plan.plan_data as Record<string, unknown>;
      const calories = data.calories ?? data.daily_calories;
      const meals = Array.isArray(data.meals) ? data.meals.length : null;
      if (calories) planSummary = `${calories} kcal/day plan`;
      else if (meals) planSummary = `${meals}-meal daily plan`;
    }
  } catch {
    // use default summary
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#60a5fa',
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          AI Weight Loss
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {planSummary}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            color: '#94a3b8',
          }}
        >
          Personalised just for me — get yours free
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
