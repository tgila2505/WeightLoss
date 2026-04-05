import type { Metadata } from 'next';

import { PageShell } from '@/app/components/page-shell';
import { OnboardingViewForm } from './components/onboarding-view-form';

export const metadata: Metadata = {
  title: 'Onboarding',
};

export default function OnboardingViewPage() {
  return (
    <PageShell>
      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
        <p className="text-sm text-slate-500">
          Review the information you provided during onboarding. All fields are read-only.
        </p>
      </header>
      <OnboardingViewForm />
    </PageShell>
  );
}
