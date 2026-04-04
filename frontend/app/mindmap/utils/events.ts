import type { MindMapEventHooks, MindMapNode } from "../types/graph"

export function emitNodeClick(
  hooks: MindMapEventHooks | undefined,
  node: MindMapNode,
): void {
  hooks?.onNodeClick?.(node)
}

export function emitNodeUpdate(
  hooks: MindMapEventHooks | undefined,
  node: MindMapNode,
): void {
  hooks?.onNodeUpdate?.(node)
}

export function emitNodeCompletion(
  hooks: MindMapEventHooks | undefined,
  node: MindMapNode,
): void {
  hooks?.onNodeCompletion?.(node)
}
