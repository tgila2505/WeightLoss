'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { Container } from '@/components/ui/container';
import { trackFunnelEvent } from '@/lib/analytics';
import { getFunnelProfile } from '@/lib/funnel-session';
import { FunnelShell } from '../components/funnel-shell';
import { UpgradeForm } from './components/upgrade-form';
import { ValueRecap } from './components/value-recap';

export default function FunnelUpgradePage() {
  const profile = getFunnelProfile();

  useEffect(() => {
    trackFunnelEvent('upgrade_clicked');
  }, []);

  return (
    <FunnelShell>
      <Container size="lg">
        <div className="grid grid-cols-1 gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:grid-cols-2 sm:p-8">
          <ValueRecap name={profile?.name} />
          <div>
            <p className="text-sm font-medium text-blue-600">Checkout</p>
            <h2 className="mb-6 mt-2 text-2xl font-semibold text-slate-900">
              Create your account
            </h2>
            <UpgradeForm />
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Log in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </FunnelShell>
  );
}
