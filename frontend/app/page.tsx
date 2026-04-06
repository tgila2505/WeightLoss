import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LogoMark, LogoText } from '@/app/components/logo';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <LogoMark size="lg" />
          <div>
            <LogoText size="lg" as="h1" />
            <p className="text-sm text-slate-500 mt-1">
              Your personal weight loss assistant
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-3">
          <Button asChild className="w-full">
            <Link href="/register">Create account</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Log in</Link>
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          Track progress, get AI meal plans, and stay on target.
        </p>
      </div>
    </main>
  );
}
