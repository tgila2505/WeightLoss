'use client';

import Link from 'next/link';

export function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
      <p className="text-2xl">🔒</p>
      <h3 className="text-base font-semibold text-slate-800">
        AI Medical Consultation is a Pro feature
      </h3>
      <p className="max-w-xs text-sm text-slate-500">
        Upgrade to Pro to chat with your Endocrinologist, Dietitian, Personal Trainer, and GP —
        personalised to your health data.
      </p>
      <Link
        href="/funnel/upgrade"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
