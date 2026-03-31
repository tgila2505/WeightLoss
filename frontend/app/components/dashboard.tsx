'use client';

import Link from 'next/link';

import type {
  HealthMetricResponse,
  LabRecordResponse,
  PlanSnapshot,
  ProfileResponse
} from '../../lib/api-client';

export function DashboardView({
  profile,
  metrics,
  labs,
  plan
}: Readonly<{
  profile: ProfileResponse | null;
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  plan: PlanSnapshot | null;
}>) {
  const latestMetric = metrics[0] ?? null;
  const alerts = [
    ...labs
      .filter((lab) => lab.evaluation.is_abnormal)
      .slice(0, 3)
      .map((lab) => `${lab.test_name}: ${lab.evaluation.status}`),
    ...(plan?.recommendations.slice(0, 2) ?? [])
  ];

  return (
    <main style={pageStyle}>
      <DashboardHeader name={profile?.name} />
      <div style={gridStyle}>
        <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>Today overview</p>
              <h2 style={{ margin: '4px 0 8px' }}>Current plan</h2>
            </div>
            <Link href="/plan">Open plan view</Link>
          </div>
          {plan ? (
            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
              }}
            >
              <PlanBlock
                title="Meals"
                items={plan.meals.map((meal) => `${meal.meal}: ${meal.name}`)}
              />
              <PlanBlock
                title="Activity"
                items={plan.activity.map((item) => `${item.title}: ${item.frequency}`)}
              />
              <PlanBlock
                title="Key actions"
                items={plan.behavioral_actions.slice(0, 3)}
              />
            </div>
          ) : (
            <EmptyState
              text="No plan generated in this session yet."
              actionHref="/interaction"
              actionLabel="Generate a plan"
            />
          )}
        </section>

        <section style={cardStyle}>
          <p style={eyebrowStyle}>Metrics</p>
          <h3 style={{ marginTop: '4px' }}>Key numbers</h3>
          {latestMetric ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <MetricRow label="Weight" value={`${latestMetric.weight_kg} kg`} />
              <MetricRow
                label="BMI"
                value={`${latestMetric.bmi ?? latestMetric.processed.derived_bmi ?? '-'}`}
              />
              <MetricRow label="Steps" value={`${latestMetric.steps ?? '-'}`} />
              <MetricRow label="Sleep" value={`${latestMetric.sleep_hours ?? '-'} h`} />
            </div>
          ) : (
            <p style={mutedStyle}>No health metrics available yet.</p>
          )}
        </section>

        <section style={cardStyle}>
          <p style={eyebrowStyle}>Alerts</p>
          <h3 style={{ marginTop: '4px' }}>Flags and reminders</h3>
          {alerts.length > 0 ? (
            <ul style={listStyle}>
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          ) : (
            <p style={mutedStyle}>No current alerts.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function DashboardHeader({ name }: Readonly<{ name?: string | null }>) {
  return (
    <header style={headerStyle}>
      <div>
        <p style={eyebrowStyle}>Dashboard</p>
        <h1 style={{ margin: '4px 0 8px' }}>
          {name ? `${name}'s today overview` : 'Today overview'}
        </h1>
        <p style={mutedStyle}>
          Review your latest plan, key metrics, and alerts in one place.
        </p>
      </div>
      <nav style={navStyle}>
        <Link href="/plan">Plan</Link>
        <Link href="/tracking">Tracking</Link>
        <Link href="/interaction">Interaction</Link>
        <Link href="/reminders">Reminders</Link>
      </nav>

    </header>
  );
}

function PlanBlock({
  title,
  items
}: Readonly<{
  title: string;
  items: string[];
}>) {
  return (
    <div
      style={{
        borderRadius: '14px',
        padding: '16px',
        backgroundColor: '#f8fafc'
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ul style={listStyle}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricRow({
  label,
  value
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0'
      }}
    >
      <span style={{ color: '#475569' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  text,
  actionHref,
  actionLabel
}: Readonly<{
  text: string;
  actionHref: string;
  actionLabel: string;
}>) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <p style={mutedStyle}>{text}</p>
      <div>
        <Link href={actionHref}>{actionLabel}</Link>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 16px',
  maxWidth: '1120px',
  margin: '0 auto'
} as const;

const headerStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  justifyContent: 'space-between',
  gap: '16px',
  marginBottom: '24px'
} as const;

const navStyle = {
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start'
} as const;

const gridStyle = {
  display: 'grid',
  gap: '20px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
} as const;

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)'
} as const;

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  marginBottom: '16px'
} as const;

const eyebrowStyle = {
  margin: 0,
  color: '#2563eb',
  fontWeight: 600,
  fontSize: '14px'
} as const;

const mutedStyle = {
  margin: 0,
  color: '#64748b'
} as const;

const listStyle = {
  margin: 0,
  paddingLeft: '18px',
  display: 'grid',
  gap: '8px'
} as const;
