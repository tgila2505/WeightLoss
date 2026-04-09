import { Container } from '@/components/ui/container';

import { FunnelShell } from '../components/funnel-shell';
import { FunnelOnboarding } from './components/funnel-onboarding';

export default function FunnelStartPage() {
  return (
    <FunnelShell>
      <Container size="sm">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-medium text-blue-600">Build your plan</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              3 quick questions, then your personalised target
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              No account needed yet. We only need a few details to calculate your plan.
            </p>
          </div>
          <FunnelOnboarding />
        </div>
      </Container>
    </FunnelShell>
  );
}
