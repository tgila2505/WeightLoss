'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { login, register } from '../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password);
      await login(email, password);
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Create account</h1>
        <p style={{ marginTop: 0, color: '#4b5563' }}>
          Start your weight loss journey.
        </p>

        <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </label>
        </div>

        {error ? (
          <p style={{ marginTop: '16px', color: '#b91c1c' }}>{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !email || !password || !confirmPassword}
          style={{
            ...primaryButtonStyle,
            marginTop: '24px',
            width: '100%',
            opacity: isSubmitting || !email || !password || !confirmPassword ? 0.6 : 1
          }}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>

        <p style={{ marginTop: '20px', textAlign: 'center', color: '#4b5563' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#2563eb' }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '24px'
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '32px',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)'
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '8px'
};

const labelTextStyle: CSSProperties = {
  fontWeight: 600
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #d1d5db',
  fontSize: '16px',
  boxSizing: 'border-box'
};

const primaryButtonStyle: CSSProperties = {
  padding: '12px 18px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '16px',
  cursor: 'pointer'
};
