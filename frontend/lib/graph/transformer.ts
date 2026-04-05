import profileTree from "./schema.json"
import { applyTreeLayout } from "./layout"
import type { Edge, Graph, Node, PositionedGraph, TreeNode } from "./types"

const ROOT_BRANCH_HORIZONTAL_OFFSET = 320
const ROOT_MIN_X = 440
const ROOT_BRANCH_VERTICAL_GAP = 164

function createNode(treeNode: TreeNode): Node {
  return {
    id: treeNode.id,
    label: treeNode.label,
    type: treeNode.type,
    metadata: treeNode.metadata,
  }
}

export function treeToGraph(root: TreeNode): Graph {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const seenNodeIds = new Set<string>()

  const traverse = (node: TreeNode, parentId?: string) => {
    if (seenNodeIds.has(node.id)) {
      throw new Error(`Duplicate node id detected: ${node.id}`)
    }

    seenNodeIds.add(node.id)
    nodes.push(createNode(node))

    if (parentId) {
      edges.push({
        source: parentId,
        target: node.id,
      })
    }

    for (const child of node.children ?? []) {
      traverse(child, node.id)
    }
  }

  traverse(root)

  return { nodes, edges }
}

export function validateGraph(graph: Graph): Graph {
  const nodeIds = new Set(graph.nodes.map((node) => node.id))

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(
        `Invalid edge detected: ${edge.source} -> ${edge.target}`,
      )
    }
  }

  return graph
}

export function buildProfileGraph(root: TreeNode): PositionedGraph {
  return applyRootFanOutLayout(applyTreeLayout(validateGraph(treeToGraph(root))))
}

function applyRootFanOutLayout(graph: PositionedGraph): PositionedGraph {
  const childMap = new Map<string, string[]>()
  const targetIds = new Set<string>()

  for (const edge of graph.edges) {
    const children = childMap.get(edge.source) ?? []
    children.push(edge.target)
    childMap.set(edge.source, children)
    targetIds.add(edge.target)
  }

  const rootNode = graph.nodes.find((node) => !targetIds.has(node.id))
  if (!rootNode) {
    return graph
  }

  const rootChildIds = childMap.get(rootNode.id) ?? []
  if (rootChildIds.length === 0) {
    return graph
  }

  const horizontalShift = Math.max(0, ROOT_MIN_X - rootNode.x)
  const shiftedNodes = graph.nodes.map((node) => ({
    ...node,
    x: node.x + horizontalShift,
  }))
  const shiftedRootNode =
    shiftedNodes.find((node) => node.id === rootNode.id) ?? rootNode

  const leftChildCount = Math.floor(rootChildIds.length / 2)
  const leftChildIds = rootChildIds.slice(0, leftChildCount)
  const rightChildIds = rootChildIds.slice(leftChildCount)
  const positionedNodes = new Map(shiftedNodes.map((node) => [node.id, node]))

  positionRootSide(
    positionedNodes,
    shiftedRootNode,
    leftChildIds,
    shiftedRootNode.x - ROOT_BRANCH_HORIZONTAL_OFFSET,
  )
  positionRootSide(
    positionedNodes,
    shiftedRootNode,
    rightChildIds,
    shiftedRootNode.x + ROOT_BRANCH_HORIZONTAL_OFFSET,
  )

  return {
    nodes: shiftedNodes.map((node) => positionedNodes.get(node.id) ?? node),
    edges: graph.edges,
  }
}

function positionRootSide(
  positionedNodes: Map<string, { id: string; x: number; y: number }>,
  rootNode: { x: number; y: number },
  childIds: string[],
  x: number,
): void {
  if (childIds.length === 0) {
    return
  }

  const startY = rootNode.y - ((childIds.length - 1) * ROOT_BRANCH_VERTICAL_GAP) / 2

  childIds.forEach((childId, index) => {
    const childNode = positionedNodes.get(childId)

    if (!childNode) {
      return
    }

    positionedNodes.set(childId, {
      ...childNode,
      x,
      y: startY + index * ROOT_BRANCH_VERTICAL_GAP,
    })
  })
}

export const sampleProfileTree = profileTree as TreeNode
export const initialGraph = validateGraph(treeToGraph(sampleProfileTree))
export const initialNodes = initialGraph.nodes
export const initialEdges = initialGraph.edges
export const initialProfileGraph = applyRootFanOutLayout(applyTreeLayout(initialGraph))
