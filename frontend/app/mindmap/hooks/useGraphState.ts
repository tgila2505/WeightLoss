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

export function useGraphState(initialGraph: InitialGraph | PositionedGraph) {
  const [nodes, setNodes] = useState<MindMapNode[]>(
    initialGraph.nodes.map(normalizeNode),
  )
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
      setNodes(storedGraph.nodes.map(normalizeNode))
      setEdges(storedGraph.edges)
    }

    setHasLoadedStorage(true)
  }, [])

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
