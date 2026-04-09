"use client"

import { fetchMindMapState, saveMindMapState } from '@/lib/api-client'
import type { MindMapEdge, MindMapNode } from "../types/graph"

const GRAPH_STORAGE_VERSION = 2

interface StoredGraphState {
  version: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export async function loadGraphState(): Promise<{ nodes: MindMapNode[]; edges: MindMapEdge[] } | null> {
  const raw = await fetchMindMapState()
  if (!raw) return null

  try {
    const parsed = raw as Partial<StoredGraphState>
    if (
      parsed.version !== GRAPH_STORAGE_VERSION ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.edges)
    ) {
      return null
    }
    return { nodes: parsed.nodes as MindMapNode[], edges: parsed.edges as MindMapEdge[] }
  } catch {
    return null
  }
}

export async function saveGraphState(input: { nodes: MindMapNode[]; edges: MindMapEdge[] }): Promise<void> {
  const payload: StoredGraphState = {
    version: GRAPH_STORAGE_VERSION,
    nodes: input.nodes,
    edges: input.edges,
  }
  await saveMindMapState(payload as unknown as Record<string, unknown>)
}
