'use client';

import type {
  AdherenceRecordResponse,
  HealthMetricResponse,
  LabRecordResponse
} from '../../lib/api-client';
import { NavBar } from './nav-bar';

export function TrackingView({
  metrics,
  labs,
  adherenceRecords
}: Readonly<{
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  adherenceRecords: AdherenceRecordResponse[];
}>) {
  return (
    <main style={pageStyle}>
      <header style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={eyebrowStyle}>Tracking</p>
          <h1 style={{ margin: '4px 0 8px' }}>Progress and history</h1>
          <p style={mutedStyle}>Review weight trends, biomarker history, and adherence signals.</p>
        </div>
        <NavBar current="Tracking" />
      </header>

      <div style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Weight trend</h2>
          {metrics.length > 0 ? (
            <ul style={listStyle}>
              {metrics.map((metric) => (
                <li key={metric.id}>
                  {formatDateTime(metric.recorded_at)}: {metric.weight_kg} kg ({metric.processed.weight_trend})
                </li>
              ))}
            </ul>
          ) : (
            <p style={mutedStyle}>No weight entries yet.</p>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Biomarker history</h2>
          {labs.length > 0 ? (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Test</th>
                  <th style={thStyle}>Value</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((lab) => (
                  <tr key={lab.id}>
                    <td style={tdStyle}>{lab.recorded_date}</td>
                    <td style={tdStyle}>{lab.test_name}</td>
                    <td style={tdStyle}>
                      {lab.value} {lab.unit ?? ''}
                    </td>
                    <td style={tdStyle}>{lab.evaluation.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={mutedStyle}>No lab history yet.</p>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Habit tracking</h2>
          {adherenceRecords.length ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {adherenceRecords.map((record) => (
                <div key={record.id} style={signalRowStyle}>
                  <strong>{record.item_name}</strong>
                  <span>
                    {formatDate(record.adherence_date)} -{' '}
                    {record.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={mutedStyle}>No adherence signals available yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
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

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const
} as const;

const thStyle = {
  textAlign: 'left' as const,
  borderBottom: '1px solid #cbd5e1',
  paddingBottom: '10px',
  fontSize: '14px'
} as const;

const tdStyle = {
  padding: '10px 0',
  borderBottom: '1px solid #e2e8f0'
} as const;

const signalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px 14px',
  borderRadius: '12px',
  backgroundColor: '#f8fafc'
} as const;
