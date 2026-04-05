"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { PositionedGraph, PositionedNode } from "@/lib/graph/types"

import { normalizeNode } from "../utils/metadata"
import { loadGraphState, saveGraphState } from "../utils/storage"
import type { MindMapEdge, MindMapGraph, MindMapNode } from "../types/graph"

type GraphNodeInput = MindMapNode | PositionedNode

interface InitialGraph {
  nodes: GraphNodeInput[]
  edges: MindMapEdge[]
}

function getRootSchemaVersion(nodes: MindMapNode[]): number | null {
  const rootNode = nodes[0]
  const version = rootNode?.metadata?.extensions?.version

  return typeof version === "number" ? version : null
}

function mergeStoredNodesWithInitialLayout(
  initialNodes: MindMapNode[],
  storedNodes: MindMapNode[],
): MindMapNode[] {
  const storedNodesById = new Map(storedNodes.map((node) => [node.id, node]))

  return initialNodes.map((initialNode) => {
    const storedNode = storedNodesById.get(initialNode.id)

    if (!storedNode) {
      return initialNode
    }

    return {
      ...storedNode,
      x: initialNode.x,
      y: initialNode.y,
      metadata: {
        ...initialNode.metadata,
        ...storedNode.metadata,
        completion: storedNode.metadata.completion,
        answers: storedNode.metadata.answers,
        savedAt: storedNode.metadata.savedAt,
        extensions: {
          ...initialNode.metadata.extensions,
          ...storedNode.metadata.extensions,
        },
      },
    }
  })
}

export function useGraphState(initialGraph: InitialGraph | PositionedGraph) {
  const normalizedInitialNodes = initialGraph.nodes.map(normalizeNode)
  const initialSchemaVersion = getRootSchemaVersion(normalizedInitialNodes)
  const [nodes, setNodes] = useState<MindMapNode[]>(normalizedInitialNodes)
  const [edges, setEdges] = useState<MindMapEdge[]>(initialGraph.edges)
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    const storedGraph = loadGraphState()

    if (storedGraph) {
      const normalizedStoredNodes = storedGraph.nodes.map(normalizeNode)
      const storedSchemaVersion = getRootSchemaVersion(normalizedStoredNodes)

      if (
        initialSchemaVersion === null ||
        storedSchemaVersion === initialSchemaVersion
      ) {
        setNodes(
          mergeStoredNodesWithInitialLayout(
            normalizedInitialNodes,
            normalizedStoredNodes,
          ),
        )
        setEdges(initialGraph.edges)
      }
    }

    setHasLoadedStorage(true)
  }, [initialSchemaVersion])

  useEffect(() => {
    if (!hasLoadedStorage) {
      return
    }

    saveGraphState({ nodes, edges })
  }, [edges, hasLoadedStorage, nodes])

  const replaceGraph = useCallback((nextGraph: MindMapGraph) => {
    setNodes(nextGraph.nodes.map(normalizeNode))
    setEdges(nextGraph.edges)
  }, [])

  const updateNode = useCallback((
    nodeId: string,
    updater: (node: MindMapNode) => MindMapNode,
  ) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    )
  }, [])

  const updateGraph = useCallback((updater: (currentGraph: MindMapGraph) => MindMapGraph) => {
    const currentGraph = { nodes: nodesRef.current, edges: edgesRef.current }
    const nextGraph = updater(currentGraph)
    setNodes(nextGraph.nodes.map(normalizeNode))
    setEdges(nextGraph.edges)
  }, [])

  const removeNodes = useCallback((nodeIds: Set<string>) => {
    updateGraph((currentGraph) => ({
      nodes: currentGraph.nodes.filter((node) => !nodeIds.has(node.id)),
      edges: currentGraph.edges.filter(
        (edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      ),
    }))
  }, [updateGraph])

  const addNode = useCallback((node: MindMapNode, edge?: MindMapEdge) => {
    updateGraph((currentGraph) => ({
      nodes: [...currentGraph.nodes, node],
      edges: edge ? [...currentGraph.edges, edge] : currentGraph.edges,
    }))
  }, [updateGraph])

  return {
    nodes,
    edges,
    hasLoadedStorage,
    replaceGraph,
    updateNode,
    updateGraph,
    removeNodes,
    addNode,
  }
}
