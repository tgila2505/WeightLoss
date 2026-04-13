'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { AuthCardShell } from '@/app/components/auth-card-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { captureEvent } from '@/lib/posthog';
import { isLoggedIn, login, register, REF_CODE_KEY } from '@/lib/auth';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem(REF_CODE_KEY, ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const refCode = localStorage.getItem(REF_CODE_KEY);

    setIsSubmitting(true);
    try {
      await register(email, password, refCode);
      localStorage.removeItem(REF_CODE_KEY);
      if (refCode) {
        captureEvent('referral_signup', { ref_code: refCode });
      }
      // Attempt auto-login after registration. If it fails for any reason
      // (e.g. a race condition or server hiccup), the account was already
      // created successfully — redirect the user to /login instead of
      // showing a confusing error or leaving them stuck.
      try {
        await login(email, password);
        router.push('/onboarding');
      } catch {
        router.push('/login?registered=1');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AuthCardShell
      title="Create account"
      description="Create your account to unlock the full WeightLoss experience."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            aria-invalid={confirmMismatch}
            aria-describedby={confirmMismatch ? 'confirm-error' : undefined}
            className={confirmMismatch ? 'border-red-500' : ''}
          />
          {confirmMismatch ? (
            <p id="confirm-error" className="text-xs text-red-600">
              Passwords do not match
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !email || !password || !confirmPassword}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCardShell>
  );
}
