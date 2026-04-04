import { getCompletionState, updateNodeMetadata } from "./metadata"
import type { CompletionState, MindMapEdge, MindMapGraph, MindMapNode } from "../types/graph"

interface ChildCompletionSummary {
  status: CompletionState
}

function buildChildMap(edges: MindMapEdge[]): Map<string, string[]> {
  const childMap = new Map<string, string[]>()

  for (const edge of edges) {
    const children = childMap.get(edge.source) ?? []
    children.push(edge.target)
    childMap.set(edge.source, children)
  }

  return childMap
}

function buildParentMap(edges: MindMapEdge[]): Map<string, string> {
  const parentMap = new Map<string, string>()

  for (const edge of edges) {
    parentMap.set(edge.target, edge.source)
  }

  return parentMap
}

function isNodeCompleted(node: MindMapNode | undefined): boolean {
  return getCompletionState(node ?? { metadata: undefined }) === "completed"
}

export function getDirectChildCompletionSummary(
  nodeId: string,
  nodes: MindMapNode[],
  edges: MindMapEdge[],
): ChildCompletionSummary {
  const childMap = buildChildMap(edges)
  const childIds = childMap.get(nodeId) ?? []

  if (childIds.length === 0) {
    const node = nodes.find((item) => item.id === nodeId)
    return {
      status: isNodeCompleted(node) ? "completed" : "incomplete",
    }
  }

  const childNodes = childIds
    .map((childId) => nodes.find((node) => node.id === childId))
    .filter((node): node is MindMapNode => Boolean(node))

  const completedChildren = childNodes.filter((node) => isNodeCompleted(node)).length

  if (completedChildren === childNodes.length) {
    return { status: "completed" }
  }

  if (completedChildren > 0) {
    return { status: "partial" }
  }

  return { status: "incomplete" }
}

export function propagateCompletionState(
  graph: MindMapGraph,
  startNodeId: string,
): MindMapGraph {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
  const parentMap = buildParentMap(graph.edges)
  const updatedNodes = new Map<string, MindMapNode>()

  const updateParent = (nodeId: string | undefined): void => {
    if (!nodeId) {
      return
    }

    const currentNode = updatedNodes.get(nodeId) ?? nodesById.get(nodeId)
    if (!currentNode) {
      return
    }

    const summary = getDirectChildCompletionSummary(
      nodeId,
      graph.nodes.map((node) => updatedNodes.get(node.id) ?? node),
      graph.edges,
    )

    updatedNodes.set(
      nodeId,
      updateNodeMetadata(currentNode, {
        completion: {
          state: summary.status,
        },
      }),
    )

    updateParent(parentMap.get(nodeId))
  }

  updateParent(parentMap.get(startNodeId))

  return {
    ...graph,
    nodes: graph.nodes.map((node) => updatedNodes.get(node.id) ?? node),
  }
}

export function syncCompletionState(graph: MindMapGraph): MindMapGraph {
  const parentMap = buildParentMap(graph.edges)
  let nextGraph = graph

  for (const node of graph.nodes) {
    if (!parentMap.has(node.id)) {
      nextGraph = propagateCompletionState(nextGraph, node.id)
    }
  }

  return nextGraph
}
