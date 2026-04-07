import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface SharedPlan {
  slug: string;
  plan_data: Record<string, unknown>;
  views: number;
  created_at: string;
  expires_at: string | null;
}

async function fetchPlan(slug: string): Promise<SharedPlan | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/shared-plans/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch plan');
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const plan = await fetchPlan(params.slug);
  if (!plan) return { title: 'Plan not found' };
  return {
    title: 'Shared Weight Loss Plan',
    description: 'A personalised AI weight loss plan shared with you.',
    openGraph: {
      images: [`/api/og/${params.slug}`],
    },
  };
}

export default async function SharedPlanPage({
  params,
}: {
  params: { slug: string };
}) {
  const plan = await fetchPlan(params.slug);
  if (!plan) notFound();

  const entries = Object.entries(plan.plan_data);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shared Weight Loss Plan</h1>
          <span className="text-sm text-muted-foreground">{plan.views} views</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plan data available.</p>
            ) : (
              entries.map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Want a personalised plan like this?
          </p>
          <Button asChild>
            <Link href="/register">Get my free plan</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
