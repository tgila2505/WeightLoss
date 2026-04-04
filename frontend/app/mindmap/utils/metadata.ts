import type { MindMapAnswerValue } from "@/lib/api-client"

import type { CompletionState, MindMapNode, MindMapNodeMetadata } from "../types/graph"

type NodeWithUnknownMetadata = {
  metadata?: unknown
}

type NodeWithCoordinates = NodeWithUnknownMetadata & {
  id: string
  label: string
  type?: string
  x: number
  y: number
}

const METADATA_KEYS = new Set([
  "completion",
  "completionStatus",
  "completed",
  "answers",
  "savedAt",
  "extensions",
])

export function getNodeMetadata(node: NodeWithUnknownMetadata): MindMapNodeMetadata {
  const raw = isPlainObject(node.metadata) ? node.metadata : {}
  const rawCompletion = isPlainObject(raw.completion) ? raw.completion : {}
  const answers = isPlainObject(raw.answers) ? raw.answers : {}
  const rawExtensions = isPlainObject(raw.extensions) ? raw.extensions : {}

  const completionState = normalizeCompletionState(
    rawCompletion.state ??
      raw.completionStatus ??
      (raw.completed === true ? "completed" : undefined),
  )

  return {
    completion: {
      state: completionState,
    },
    answers: Object.fromEntries(
      Object.entries(answers).filter(
        ([, value]) => typeof value === "string" || typeof value === "number",
      ),
    ) as Record<string, MindMapAnswerValue>,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null,
    extensions: {
      ...Object.fromEntries(
        Object.entries(raw).filter(([key]) => !METADATA_KEYS.has(key)),
      ),
      ...rawExtensions,
    },
  }
}

export function updateNodeMetadata(
  node: MindMapNode,
  updates: Partial<MindMapNodeMetadata>,
): MindMapNode {
  const current = getNodeMetadata(node)

  return {
    ...node,
    metadata: {
      completion: {
        state: updates.completion?.state ?? current.completion.state,
      },
      answers: updates.answers ?? current.answers,
      savedAt:
        updates.savedAt === undefined ? current.savedAt : updates.savedAt,
      extensions: {
        ...current.extensions,
        ...(updates.extensions ?? {}),
      },
    },
  }
}

export function normalizeNode(node: NodeWithCoordinates): MindMapNode {
  return {
    ...node,
    metadata: getNodeMetadata(node),
  }
}

export function getCompletionState(node: NodeWithUnknownMetadata): CompletionState {
  return getNodeMetadata(node).completion.state
}

function normalizeCompletionState(value: unknown): CompletionState {
  if (value === "completed" || value === "partial" || value === "incomplete") {
    return value
  }

  return "incomplete"
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
