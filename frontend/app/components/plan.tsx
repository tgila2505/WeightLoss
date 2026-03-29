'use client';

import type { PlanSnapshot } from '../../lib/api-client';
import { Checklist } from './checklist';

export function PlanView({
  plan
}: Readonly<{
  plan: PlanSnapshot | null;
}>) {
  if (!plan) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Plan breakdown</h1>
          <p style={mutedStyle}>Generate a plan from the interaction page to see your meals and activities.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Plan</p>
          <h1 style={{ margin: '4px 0 8px' }}>Daily breakdown</h1>
          <p style={mutedStyle}>Meals, activity, and actions from the latest generated plan.</p>
        </div>
      </header>

      <div style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Meals</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {plan.meals.map((meal) => (
              <div key={`${meal.meal}-${meal.name}`} style={panelStyle}>
                <strong style={{ textTransform: 'capitalize' }}>{meal.meal}</strong>
                <p style={{ margin: '6px 0 0' }}>{meal.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Activity</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {plan.activity.map((item) => (
              <div key={`${item.title}-${item.frequency}`} style={panelStyle}>
                <strong>{item.title}</strong>
                <p style={{ margin: '6px 0 0' }}>{item.frequency}</p>
              </div>
            ))}
          </div>
        </section>

        <Checklist
          title="Action checklist"
          items={[...plan.behavioral_actions, ...plan.recommendations]}
        />
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 16px',
  maxWidth: '1120px',
  margin: '0 auto'
} as const;

const headerStyle = {
  marginBottom: '24px'
} as const;

const gridStyle = {
  display: 'grid',
  gap: '20px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
} as const;

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)'
} as const;

const panelStyle = {
  borderRadius: '14px',
  backgroundColor: '#f8fafc',
  padding: '14px'
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
