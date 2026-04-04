import type { MindMapAnswerValue } from "@/lib/api-client"
import type { Edge as BaseEdge, PositionedNode as BasePositionedNode } from "@/lib/graph/types"

export type CompletionState = "incomplete" | "partial" | "completed"

export interface MindMapNodeMetadata {
  completion: {
    state: CompletionState
  }
  answers: Record<string, MindMapAnswerValue>
  savedAt: string | null
  extensions: Record<string, unknown>
}

export interface MindMapNode extends Omit<BasePositionedNode, "metadata"> {
  x: number
  y: number
  metadata: MindMapNodeMetadata
}

export type MindMapEdge = BaseEdge

export interface MindMapGraph {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export interface MindMapEventHooks {
  onNodeClick?: (node: MindMapNode) => void
  onNodeUpdate?: (node: MindMapNode) => void
  onNodeCompletion?: (node: MindMapNode) => void
}
