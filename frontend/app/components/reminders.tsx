'use client';

import { useEffect, useState } from 'react';

import {
  createReminder,
  fetchReminders,
  type ReminderResponse
} from '../../lib/api-client';
import { NavBar } from './nav-bar';

const REMINDER_TYPES = ['medication', 'meal', 'exercise', 'water', 'sleep', 'other'];
const CADENCES = ['daily', 'weekdays', 'weekends', 'weekly'];

export function RemindersView() {
  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState(REMINDER_TYPES[0]);
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [cadence, setCadence] = useState(CADENCES[0]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchReminders();
        if (isMounted) {
          setReminders(data);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load reminders.');
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);

    try {
      const created = await createReminder({
        title: title.trim(),
        reminder_type: reminderType,
        scheduled_time: `${scheduledTime}:00`,
        cadence,
        is_active: true
      });
      setReminders((prev) => [...prev, created]);
      setTitle('');
      setScheduledTime('08:00');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to create reminder.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <header style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={eyebrowStyle}>Reminders</p>
          <h1 style={{ margin: '4px 0 8px' }}>Scheduled reminders</h1>
          <p style={mutedStyle}>
            Set daily reminders for medications, meals, exercise, and other habits.
          </p>
        </div>
        <NavBar current="Reminders" />
      </header>

      <div style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Add a reminder</h2>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '14px' }}>
            <label style={labelStyle}>
              Title
              <input
                style={inputStyle}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Take metformin"
                required
                maxLength={255}
              />
            </label>

            <label style={labelStyle}>
              Type
              <select
                style={inputStyle}
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value)}
              >
                {REMINDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Time (UTC)
              <input
                style={inputStyle}
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </label>

            <label style={labelStyle}>
              Cadence
              <select
                style={inputStyle}
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
              >
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {saveError ? <p style={errorStyle}>{saveError}</p> : null}

            <button type="submit" disabled={isSaving} style={buttonStyle}>
              {isSaving ? 'Saving…' : 'Add reminder'}
            </button>
          </form>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Your reminders</h2>
          {loadError ? (
            <p style={errorStyle}>{loadError}</p>
          ) : reminders.length === 0 ? (
            <p style={mutedStyle}>No reminders yet. Add one on the left.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {reminders.map((reminder) => (
                <div key={reminder.id} style={reminderRowStyle(reminder.is_active)}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{reminder.title}</p>
                    <p style={reminderMetaStyle}>
                      {reminder.reminder_type} · {formatTime(reminder.scheduled_time)} ·{' '}
                      {reminder.cadence}
                    </p>
                  </div>
                  <span style={statusBadgeStyle(reminder.is_active)}>
                    {reminder.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatTime(value: string): string {
  const [h, m] = value.split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
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

const labelStyle = {
  display: 'grid',
  gap: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151'
} as const;

const inputStyle = {
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box' as const
} as const;

const buttonStyle = {
  padding: '10px 20px',
  borderRadius: '10px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer'
} as const;

const errorStyle = {
  margin: 0,
  color: '#b91c1c',
  fontSize: '13px'
} as const;

function reminderRowStyle(isActive: boolean) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: isActive ? '#f0fdf4' : '#f8fafc'
  } as const;
}

const reminderMetaStyle = {
  margin: '4px 0 0',
  fontSize: '12px',
  color: '#64748b'
} as const;

function statusBadgeStyle(isActive: boolean) {
  return {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: isActive ? '#dcfce7' : '#f1f5f9',
    color: isActive ? '#166534' : '#64748b',
    whiteSpace: 'nowrap' as const
  } as const;
}
