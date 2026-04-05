'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

import {
  createAdherenceRecord,
  fetchAdherenceRecords,
  type AdherenceRecordResponse
} from '../../lib/api-client';

interface ChecklistItem {
  name: string;
  itemType: string;
  subtitle?: string;
}

export function Checklist({
  items,
  title,
  label,
}: Readonly<{
  items: ChecklistItem[];
  title: string;
  label?: string;
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
    <Card>
      <CardHeader className="pb-3">
        {label ? (
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {label}
          </p>
        ) : null}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No checklist items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const key = buildItemKey(item.name, item.itemType);
              const isDone = completed[key] ?? false;
              return (
                <label
                  key={`${item.itemType}:${item.name}`}
                  className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isDone ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => handleToggle(item.name, item.itemType)}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className={`text-sm leading-snug ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.subtitle ? (
                      <span className={`text-xs ${isDone ? 'text-slate-300' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildCompletionState(
  items: ChecklistItem[],
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
