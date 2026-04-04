export interface NodeMetadata {
  [key: string]: unknown
}

export interface Node {
  id: string
  label: string
  type?: string
  metadata?: NodeMetadata
}

export interface Edge {
  source: string
  target: string
  type?: string
}

export interface PositionedNode extends Node {
  x: number
  y: number
}

export interface Graph {
  nodes: Node[]
  edges: Edge[]
}

export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: Edge[]
}

export interface TreeNode {
  id: string
  label: string
  type?: string
  metadata?: NodeMetadata
  children?: TreeNode[]
}
