import Link from 'next/link';
import type { CSSProperties } from 'react';

export default function HomePage() {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Welcome</h1>
        <p style={{ marginTop: 0, color: '#4b5563' }}>
          Your personal weight loss assistant. Track progress, get meal plans, and stay on target.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginTop: '28px' }}>
          <Link href="/register" style={primaryLinkStyle}>
            Create account
          </Link>
          <Link href="/login" style={secondaryLinkStyle}>
            Log in
          </Link>
        </div>
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

const primaryLinkStyle: CSSProperties = {
  display: 'block',
  padding: '12px 18px',
  borderRadius: '10px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '16px',
  textAlign: 'center',
  textDecoration: 'none'
};

const secondaryLinkStyle: CSSProperties = {
  display: 'block',
  padding: '12px 18px',
  borderRadius: '10px',
  backgroundColor: '#e5e7eb',
  color: '#111827',
  fontWeight: 600,
  fontSize: '16px',
  textAlign: 'center',
  textDecoration: 'none'
};
