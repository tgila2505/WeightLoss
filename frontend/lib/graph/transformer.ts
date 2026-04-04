import profileTree from "./schema.json"
import { applyTreeLayout } from "./layout"
import type { Edge, Graph, PositionedGraph, TreeNode, Node } from "./types"

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
  return applyTreeLayout(validateGraph(treeToGraph(root)))
}

export const sampleProfileTree = profileTree as TreeNode
export const initialGraph = validateGraph(treeToGraph(sampleProfileTree))
export const initialNodes = initialGraph.nodes
export const initialEdges = initialGraph.edges
export const initialProfileGraph = applyTreeLayout(initialGraph)
