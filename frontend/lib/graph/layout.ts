import type { Graph, PositionedGraph, PositionedNode } from "./types"

const DEFAULT_HORIZONTAL_SPACING = 240
const DEFAULT_VERTICAL_SPACING = 120

interface LayoutOptions {
  horizontalSpacing?: number
  verticalSpacing?: number
}

export function applyTreeLayout(
  graph: Graph,
  options: LayoutOptions = {},
): PositionedGraph {
  const horizontalSpacing =
    options.horizontalSpacing ?? DEFAULT_HORIZONTAL_SPACING
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING

  const childMap = new Map<string, string[]>()
  const targetIds = new Set<string>()

  for (const node of graph.nodes) {
    childMap.set(node.id, [])
  }

  for (const edge of graph.edges) {
    const children = childMap.get(edge.source)

    if (!children) {
      throw new Error(`Missing source node for edge: ${edge.source}`)
    }

    children.push(edge.target)
    targetIds.add(edge.target)
  }

  const root = graph.nodes.find((node) => !targetIds.has(node.id))

  if (!root) {
    throw new Error("Unable to determine graph root for layout")
  }

  const positions = new Map<string, { x: number; y: number }>()
  let nextRow = 0

  const assignPosition = (nodeId: string, depth: number): number => {
    const children = childMap.get(nodeId) ?? []

    if (children.length === 0) {
      const row = nextRow
      nextRow += 1
      positions.set(nodeId, {
        x: depth * horizontalSpacing,
        y: row * verticalSpacing,
      })
      return row
    }

    const childRows = children.map((childId) => assignPosition(childId, depth + 1))
    const row = (childRows[0] + childRows[childRows.length - 1]) / 2

    positions.set(nodeId, {
      x: depth * horizontalSpacing,
      y: row * verticalSpacing,
    })

    return row
  }

  assignPosition(root.id, 0)

  const nodes: PositionedNode[] = graph.nodes.map((node) => {
    const position = positions.get(node.id)

    if (!position) {
      throw new Error(`Missing layout position for node: ${node.id}`)
    }

    return {
      ...node,
      x: position.x,
      y: position.y,
    }
  })

  return {
    nodes,
    edges: graph.edges,
  }
}
