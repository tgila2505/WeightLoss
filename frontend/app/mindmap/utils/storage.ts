"use client"

import type { MindMapEdge, MindMapNode } from "../types/graph"

const GRAPH_STORAGE_KEY = "mindmap-graph-state"
const GRAPH_STORAGE_VERSION = 2

interface StoredGraphState {
  version: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export function loadGraphState(): {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
} | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredGraphState>

    if (
      parsed.version !== GRAPH_STORAGE_VERSION ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.edges)
    ) {
      return null
    }

    return {
      nodes: parsed.nodes as MindMapNode[],
      edges: parsed.edges as MindMapEdge[],
    }
  } catch {
    return null
  }
}

export function saveGraphState(input: {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}): void {
  if (typeof window === "undefined") {
    return
  }

  const payload: StoredGraphState = {
    version: GRAPH_STORAGE_VERSION,
    nodes: input.nodes,
    edges: input.edges,
  }

  window.localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify(payload))
}
