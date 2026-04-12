import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  buildPseoSlug,
  buildPseoTitle,
  buildPseoDescription,
  buildPseoH1,
  getCoreSlugList,
  parsePseoSlug,
  type DietType,
  type GoalType,
} from '@/lib/seo/pseo-combinations';
import { getRelatedPages } from '@/lib/seo/related-pages';
import { buildMetadata } from '@/lib/seo/metadata';
import { buildWebPageSchema, buildFaqSchema, buildBreadcrumbSchema, buildHowToSchema, buildSpeakableSchema, buildOrganizationSchema } from '@/lib/seo/schema';
import { getPseoContent } from '@/content/plans/templates';
import { SeoCta } from './seo-cta';

export const revalidate = 604800; // 7 days
export const dynamicParams = true; // serve any valid goal/diet slug without rebuild

interface Props {
  params: Promise<{ slug: string }>;
}


export async function generateStaticParams() {
  return getCoreSlugList().map((dims) => ({
    slug: buildPseoSlug(dims),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dims = parsePseoSlug(slug);
  if (!dims) return {};

  const { goalType, dietType } = dims;
  const title = `${buildPseoTitle({ goalType, dietType })} | AI Metabolic Coach`;
  const description = buildPseoDescription({ goalType, dietType });
  const h1 = buildPseoH1({ goalType, dietType });
  const content = getPseoContent({ goalType, dietType });

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Plans', path: '/plan' },
    { name: h1, path: `/plan/${slug}` },
  ];

  const howToSteps = [
    { name: 'Calculate your TDEE', text: `Use the calculator to find your Total Daily Energy Expenditure for your ${h1} goal.` },
    { name: 'Set your calorie target', text: 'Apply a 500–750 kcal/day deficit below your TDEE for steady, sustainable fat loss.' },
    { name: 'Hit your protein target', text: 'Eat 1.6–2.2 g of protein per kg of body weight daily to preserve muscle.' },
    { name: 'Follow the food plan', text: 'Prioritise the foods listed below and hit your daily macro targets consistently.' },
    { name: 'Track and adjust weekly', text: 'Weigh yourself weekly and adjust calories down by 100–200 kcal if progress stalls for 2+ weeks.' },
  ];

  const schemas = [
    buildOrganizationSchema(),
    buildWebPageSchema({ name: h1, description, path: `/plan/${slug}` }),
    buildBreadcrumbSchema(breadcrumbs),
    buildHowToSchema(h1, description, howToSteps),
    ...(content.faq ? [buildFaqSchema(content.faq)] : []),
    buildSpeakableSchema(`/plan/${slug}`, ['[data-ai-summary]', 'h1', '[data-ai-qa]']),
  ];

  const base = buildMetadata({ title, description, path: `/plan/${slug}`, ogImage: `/api/og/plan/${slug}` });

  return {
    ...base,
    other: {
      'script:ld+json': schemas.map((s) => JSON.stringify(s)),
    },
  };
}

export default async function PseoPage({ params }: Props) {
  const { slug } = await params;
  const dims = parsePseoSlug(slug);
  if (!dims) return notFound();

  const { goalType, dietType } = dims;
  const content = getPseoContent({ goalType, dietType });
  const relatedPages = getRelatedPages({ goalType, dietType });
  const h1 = buildPseoH1({ goalType, dietType });

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Plans', path: '/plan' },
    { name: h1, path: `/plan/${slug}` },
  ];

  const preset = dietType ? `${goalType}-${dietType}` : goalType;
  const funnelHref = `/funnel?preset=${preset}&ref=plan-${slug}`;

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-blue-600 transition-colors">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-slate-700 font-medium">{crumb.name}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white border-b border-slate-100 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Personalised Plan
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {h1}
          </h1>
          <p className="text-base text-slate-600 max-w-xl mx-auto mb-8">
            {buildPseoDescription({ goalType, dietType })}
          </p>
          <SeoCta
            href={funnelHref}
            defaultText={`Get your personalised ${dietType ? dietType.replace(/-/g, ' ') + ' ' : ''}plan →`}
          />
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-14">
        {/* TL;DR — AI-readable quick summary */}
        <section
          aria-label="Quick summary"
          data-ai-summary
          className="bg-slate-50 border border-slate-200 rounded-2xl p-6"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick summary</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-700 shrink-0">Goal:</dt>
              <dd className="text-slate-600">{h1}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-700 shrink-0">Approach:</dt>
              <dd className="text-slate-600">
                {dietType
                  ? `${dietType.replace(/-/g, ' ')} diet with a sustained calorie deficit`
                  : 'Calorie deficit with balanced macro targets'}
              </dd>
            </div>
            {content.calorieGuidance && (
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-700 shrink-0">Calories:</dt>
                <dd className="text-slate-600">{content.calorieGuidance}</dd>
              </div>
            )}
            {content.proteinTarget && (
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-700 shrink-0">Protein:</dt>
                <dd className="text-slate-600">{content.proteinTarget}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-700 shrink-0">Top foods:</dt>
              <dd className="text-slate-600">{content.foodsToPrioritize.slice(0, 3).join(', ')}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-700 shrink-0">Results timeline:</dt>
              <dd className="text-slate-600">Noticeable changes in 4–8 weeks with consistent adherence</dd>
            </div>
          </dl>
        </section>

        {/* Intro */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            {dietType
              ? `What is a ${dietType.replace(/-/g, ' ')} plan for ${goalType.replace(/-/g, ' ')}?`
              : `What does it take to ${goalType.replace(/-/g, ' ')}?`}
          </h2>
          <p className="text-slate-600 leading-relaxed">{content.intro}</p>
          {content.dietIntro && (
            <p className="text-slate-600 leading-relaxed mt-3">{content.dietIntro}</p>
          )}
        </section>

        {/* Macro targets */}
        {content.calorieGuidance && (
          <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h2 className="text-base font-bold text-blue-900 mb-2">Macro targets</h2>
            <p className="text-sm text-blue-800">{content.calorieGuidance}</p>
            {content.proteinTarget && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Protein:</strong> {content.proteinTarget}
              </p>
            )}
          </section>
        )}

        {/* Foods to prioritise */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7 foods to prioritise</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {content.foodsToPrioritize.map((food) => (
              <li
                key={food}
                className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 text-sm font-medium text-emerald-800 border border-emerald-100"
              >
                <span aria-hidden="true" className="text-emerald-500">✓</span>
                {food}
              </li>
            ))}
          </ul>
        </section>

        {/* Common mistakes */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3 common mistakes to avoid</h2>
          <ul className="space-y-3">
            {content.commonMistakes.map((mistake, i) => (
              <li key={i} className="flex gap-3 text-slate-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 border border-red-100 text-red-500 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {mistake}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        {content.faq && content.faq.length > 0 && (
          <section data-ai-qa>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {content.faq.map(({ q, a }) => (
                <details
                  key={q}
                  className="border border-slate-200 rounded-xl overflow-hidden group"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-50 transition-colors list-none">
                    {q}
                    <span className="text-slate-400 ml-2 flex-shrink-0">▾</span>
                  </summary>
                  <div className="px-5 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related plans */}
        {relatedPages.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Related plans</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/plan/${page.slug}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    {page.title}
                  </span>
                  <span className="text-slate-300 group-hover:text-blue-400 ml-2">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="bg-slate-900 rounded-2xl px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Get your personalised version of this plan
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Answer 3 questions and get an AI-optimised plan built for your body, schedule, and goals.
          </p>
          <a
            href={funnelHref}
            className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-500 text-white hover:bg-blue-400 transition-colors"
          >
            Start for free →
          </a>
        </section>
      </div>
    </main>
  );
}
