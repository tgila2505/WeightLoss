'use client';

import { useEffect, useState } from 'react';

import {
  createAdherenceRecord,
  fetchAdherenceRecords,
  type AdherenceRecordResponse
} from '../../lib/api-client';

export function Checklist({
  items,
  title
}: Readonly<{
  items: Array<{
    name: string;
    itemType: string;
  }>;
  title: string;
}>) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const nextState: Record<string, boolean> = {};
    items.forEach((item) => {
      const key = buildItemKey(item.name, item.itemType);
      nextState[key] = completed[key] ?? false;
    });
    setCompleted(nextState);
  }, [items.map((item) => `${item.itemType}:${item.name}`).join('|')]);

  useEffect(() => {
    let isMounted = true;

    async function loadTodayStatus() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const records = await fetchAdherenceRecords({
          startDate: today,
          endDate: today
        });

        if (!isMounted) {
          return;
        }

        const nextState = buildCompletionState(items, records);
        setCompleted((current) => ({ ...current, ...nextState }));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load checklist progress.'
        );
      }
    }

    if (items.length > 0) {
      loadTodayStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [items]);

  async function handleToggle(itemName: string, itemType: string) {
    const itemKey = buildItemKey(itemName, itemType);
    const nextValue = !(completed[itemKey] ?? false);
    setCompleted((current) => ({
      ...current,
      [itemKey]: nextValue
    }));
    setError('');

    try {
      await createAdherenceRecord({
        item_type: itemType,
        item_name: itemName,
        completed: nextValue,
        adherence_date: new Date().toISOString().slice(0, 10),
        score: nextValue ? 100 : 0
      });
    } catch (saveError) {
      setCompleted((current) => ({
        ...current,
        [itemKey]: !nextValue
      }));
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save checklist progress.'
      );
    }
  }

  return (
    <section style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={mutedStyle}>No checklist items yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {items.map((item) => (
            <label
              key={`${item.itemType}:${item.name}`}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: completed[buildItemKey(item.name, item.itemType)]
                  ? '#ecfdf5'
                  : '#f8fafc'
              }}
            >
              <input
                type="checkbox"
                checked={completed[buildItemKey(item.name, item.itemType)] ?? false}
                onChange={() => handleToggle(item.name, item.itemType)}
              />
              <span
                style={{
                  textDecoration: completed[buildItemKey(item.name, item.itemType)]
                    ? 'line-through'
                    : 'none'
                }}
              >
                {item.name}
              </span>
            </label>
          ))}
        </div>
      )}
      {error ? <p style={errorStyle}>{error}</p> : null}
    </section>
  );
}

function buildCompletionState(
  items: Array<{ name: string; itemType: string }>,
  records: AdherenceRecordResponse[]
): Record<string, boolean> {
  const allowedKeys = new Set(items.map((item) => buildItemKey(item.name, item.itemType)));
  const state: Record<string, boolean> = {};

  records.forEach((record) => {
    const key = buildItemKey(record.item_name, record.item_type);
    if (!allowedKeys.has(key) || state[key] !== undefined) {
      return;
    }
    state[key] = record.completed;
  });

  return state;
}

function buildItemKey(name: string, itemType: string): string {
  return `${itemType}:${name}`;
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

const errorStyle = {
  marginTop: '12px',
  marginBottom: 0,
  color: '#b91c1c'
} as const;
