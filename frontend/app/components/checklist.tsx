'use client';

import { useEffect, useState } from 'react';

export function Checklist({
  items,
  title
}: Readonly<{
  items: string[];
  title: string;
}>) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextState: Record<string, boolean> = {};
    items.forEach((item) => {
      nextState[item] = completed[item] ?? false;
    });
    setCompleted(nextState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join('|')]);

  return (
    <section style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={mutedStyle}>No checklist items yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {items.map((item) => (
            <label
              key={item}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: completed[item] ? '#ecfdf5' : '#f8fafc'
              }}
            >
              <input
                type="checkbox"
                checked={completed[item] ?? false}
                onChange={() =>
                  setCompleted((current) => ({
                    ...current,
                    [item]: !current[item]
                  }))
                }
              />
              <span
                style={{
                  textDecoration: completed[item] ? 'line-through' : 'none'
                }}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
} as const;

const mutedStyle = {
  margin: 0,
  color: '#64748b'
} as const;
