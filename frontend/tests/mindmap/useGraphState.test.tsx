import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGraphState } from '@/app/mindmap/hooks/useGraphState';

const initialGraph = {
  nodes: [
    {
      id: 'root',
      label: 'Root',
      type: 'profile',
      x: 0,
      y: 0,
      metadata: {
        completion: { state: 'incomplete' as const },
        answers: {},
        savedAt: null,
        extensions: {}
      }
    }
  ],
  edges: []
};

describe('useGraphState', () => {
  it('hydrates from localStorage when saved state exists', async () => {
    window.localStorage.setItem(
      'mindmap-graph-state',
      JSON.stringify({
        version: 2,
        nodes: [
          {
            id: 'root',
            label: 'Saved Root',
            type: 'profile',
            x: 12,
            y: 18,
            metadata: {
              completion: { state: 'completed' },
              answers: {},
              savedAt: null,
              extensions: {}
            }
          }
        ],
        edges: []
      })
    );

    const { result } = renderHook(() => useGraphState(initialGraph));

    await waitFor(() => {
      expect(result.current.hasLoadedStorage).toBe(true);
      expect(result.current.nodes[0].label).toBe('Saved Root');
      expect(result.current.nodes[0].metadata.completion.state).toBe('completed');
    });
  });

  it('persists localized node updates back to localStorage', async () => {
    const { result } = renderHook(() => useGraphState(initialGraph));

    await waitFor(() => {
      expect(result.current.hasLoadedStorage).toBe(true);
    });

    act(() => {
      result.current.updateNode('root', (node) => ({
        ...node,
        label: 'Updated Root'
      }));
    });

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('mindmap-graph-state') ?? '{}');
      expect(stored.nodes[0].label).toBe('Updated Root');
    });
  });
});
