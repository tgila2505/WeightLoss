'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import {
  createReminder,
  fetchReminders,
  type ReminderResponse
} from '../../lib/api-client';
import { PageShell } from './page-shell';

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
    <PageShell>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Reminders
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Scheduled reminders</h1>
        <p className="text-sm text-slate-500 mt-2">
          Set daily reminders for medications, meals, exercise, and other habits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add reminder form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add a reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reminder-title">Title</Label>
                <Input
                  id="reminder-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Take metformin"
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-type">Type</Label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger id="reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-time">Time (UTC)</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-cadence">Cadence</Label>
                <Select value={cadence} onValueChange={setCadence}>
                  <SelectTrigger id="reminder-cadence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {saveError ? (
                <p className="text-sm text-red-600">{saveError}</p>
              ) : null}

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Add reminder'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Reminder list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your reminders</CardTitle>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="text-sm text-red-600">{loadError}</p>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-slate-500">No reminders yet. Add one on the left.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                      reminder.is_active ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {reminder.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {reminder.reminder_type} · {formatTime(reminder.scheduled_time)} ·{' '}
                        {reminder.cadence}
                      </p>
                    </div>
                    <Badge
                      variant={reminder.is_active ? 'secondary' : 'outline'}
                      className={`flex-shrink-0 text-xs ${
                        reminder.is_active
                          ? 'bg-emerald-100 text-emerald-700 border-0'
                          : 'text-slate-500'
                      }`}
                    >
                      {reminder.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function formatTime(value: string): string {
  const [h, m] = value.split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
