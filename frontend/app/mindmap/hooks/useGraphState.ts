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

  // Single combined state — updateGraph uses functional setState so it always
  // receives the latest committed value, eliminating the stale-ref race condition
  // that previously existed when nodesRef was updated via useEffect.
  const [graph, setGraph] = useState<MindMapGraph>({
    nodes: normalizedInitialNodes,
    edges: initialGraph.edges,
  })
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isMounted = true

    loadGraphState().then((storedGraph) => {
      if (!isMounted) return

      if (storedGraph) {
        const normalizedStoredNodes = storedGraph.nodes.map(normalizeNode)
        const storedSchemaVersion = getRootSchemaVersion(normalizedStoredNodes)

        if (
          initialSchemaVersion === null ||
          storedSchemaVersion === initialSchemaVersion
        ) {
          setGraph({
            nodes: mergeStoredNodesWithInitialLayout(
              normalizedInitialNodes,
              normalizedStoredNodes,
            ),
            edges: initialGraph.edges,
          })
        }
      }

      setHasLoadedStorage(true)
    }).catch(() => {
      if (isMounted) setHasLoadedStorage(true)
    })

    return () => { isMounted = false }
  }, [initialSchemaVersion])

  // Debounced auto-save: coalesces rapid state changes into a single write,
  // preventing main-thread thrash from burst completion propagation updates.
  useEffect(() => {
    if (!hasLoadedStorage) {
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      saveGraphState({ nodes: graph.nodes, edges: graph.edges })
    }, 300)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [graph, hasLoadedStorage])

  const replaceGraph = useCallback((nextGraph: MindMapGraph) => {
    setGraph({
      nodes: nextGraph.nodes.map(normalizeNode),
      edges: nextGraph.edges,
    })
  }, [])

  const updateNode = useCallback((
    nodeId: string,
    updater: (node: MindMapNode) => MindMapNode,
  ) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    }))
  }, [])

  const updateGraph = useCallback((updater: (currentGraph: MindMapGraph) => MindMapGraph) => {
    setGraph((current) => {
      const nextGraph = updater(current)
      return { nodes: nextGraph.nodes.map(normalizeNode), edges: nextGraph.edges }
    })
  }, [])

  const removeNodes = useCallback((nodeIds: Set<string>) => {
    setGraph((current) => ({
      nodes: current.nodes.filter((node) => !nodeIds.has(node.id)),
      edges: current.edges.filter(
        (edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      ),
    }))
  }, [])

  const addNode = useCallback((node: MindMapNode, edge?: MindMapEdge) => {
    setGraph((current) => ({
      nodes: [...current.nodes, node],
      edges: edge ? [...current.edges, edge] : current.edges,
    }))
  }, [])

  return {
    nodes: graph.nodes,
    edges: graph.edges,
    hasLoadedStorage,
    replaceGraph,
    updateNode,
    updateGraph,
    removeNodes,
    addNode,
  }
}
