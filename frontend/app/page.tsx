import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
        }}
      >
        <h1 style={{ marginTop: 0 }}>Welcome</h1>
        <p>Complete onboarding, then use the dashboard to review plans, tracking, and assistant responses.</p>
        <div style={{ display: 'grid', gap: '10px' }}>
          <Link href="/onboarding">Go to onboarding</Link>
          <Link href="/dashboard">Open dashboard</Link>
          <Link href="/interaction">Open interaction</Link>
        </div>
      </div>
    </main>
  );
}
