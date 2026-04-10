"use client"

import type { MindMapEdge, MindMapNode } from "../types/graph"

const GRAPH_STORAGE_VERSION = 2
const STORAGE_KEY = 'mindmap-graph-state'

interface StoredGraphState {
  version: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export async function loadGraphState(): Promise<{ nodes: MindMapNode[]; edges: MindMapEdge[] } | null> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredGraphState>
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
