import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendInteractionHistory,
  fetchMindMapAnswers,
  getInteractionHistory,
  getLatestPlan,
  saveLatestPlan,
  saveMindMapAnswers,
  upsertProfile
} from '@/lib/api-client';

describe('api client helpers', () => {
  beforeEach(() => {
    window.localStorage.setItem('access_token', 'token-123');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('upsertProfile falls back to PUT when POST returns conflict', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Profile already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await upsertProfile({
      name: 'Person',
      age: '32',
      gender: '',
      height_cm: '170',
      weight_kg: '80',
      goal_target_weight_kg: '72',
      goal_timeline_weeks: '12',
      health_conditions: '',
      activity_level: 'moderate',
      sleep_hours: '7',
      diet_pattern: 'balanced'
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/v1/profile',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('saveLatestPlan round-trips through session storage', () => {
    const plan = {
      intent: 'meal_plan',
      meals: [{ meal: 'breakfast', name: 'Oats' }],
      activity: [{ title: 'Walk', frequency: 'Daily' }],
      behavioral_actions: ['Hydrate'],
      lab_insights: [],
      risks: [],
      recommendations: ['Keep it simple'],
      adherence_signals: [],
      constraints_applied: [],
      biomarker_adjustments: []
    };

    saveLatestPlan(plan);

    expect(getLatestPlan()).toEqual(plan);
  });

  it('stores interaction history in reverse chronological order', () => {
    appendInteractionHistory({
      prompt: 'first',
      reply: 'one',
      created_at: '2026-04-04T10:00:00.000Z'
    });
    appendInteractionHistory({
      prompt: 'second',
      reply: 'two',
      created_at: '2026-04-04T10:01:00.000Z'
    });

    expect(getInteractionHistory().map((item) => item.prompt)).toEqual(['second', 'first']);
  });

  it('saveMindMapAnswers encodes node answers through adherence records', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          user_id: 7,
          item_type: 'mindmap_node',
          item_name: '{}',
          completed: true,
          adherence_date: '2026-04-04',
          score: 100,
          created_at: '2026-04-04T10:00:00.000Z',
          updated_at: '2026-04-04T10:00:00.000Z'
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );

    const record = await saveMindMapAnswers({
      nodeId: 'node-1',
      answers: { goal: 'Walk daily' }
    });

    expect(record.nodeId).toBe('node-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/adherence',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('fetchMindMapAnswers keeps only the newest record per node', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 1,
            user_id: 7,
            item_type: 'mindmap_node',
            item_name: JSON.stringify({
              n: 'node-1',
              a: { goal: 'Old' },
              s: '2026-04-04T10:00:00.000Z'
            }),
            completed: true,
            adherence_date: '2026-04-04',
            score: 100,
            created_at: '2026-04-04T10:00:00.000Z',
            updated_at: '2026-04-04T10:00:00.000Z'
          },
          {
            id: 2,
            user_id: 7,
            item_type: 'mindmap_node',
            item_name: JSON.stringify({
              n: 'node-1',
              a: { goal: 'New' },
              s: '2026-04-04T11:00:00.000Z'
            }),
            completed: true,
            adherence_date: '2026-04-04',
            score: 100,
            created_at: '2026-04-04T11:00:00.000Z',
            updated_at: '2026-04-04T11:00:00.000Z'
          }
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );

    const records = await fetchMindMapAnswers();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      nodeId: 'node-1',
      answers: { goal: 'New' }
    });
  });
});
