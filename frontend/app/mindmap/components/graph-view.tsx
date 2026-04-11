"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react"

import { PageShell } from "@/app/components/page-shell"
import {
  fetchProfile,
  fetchAllQuestionnaireAnswers,
  saveNodeAnswers,
  type MindMapAnswerValue,
} from "@/lib/api-client"
import { UXModeSwitcher } from "@/components/ux-mode-switcher"
import { initialProfileGraph } from "@/lib/graph/transformer"

import { useGraphState } from "../hooks/useGraphState"
import { getQuestionsForNode } from "../schema/questions"
import { propagateCompletionState } from "../utils/completion"
import { emitNodeClick, emitNodeCompletion, emitNodeUpdate } from "../utils/events"
import { getNodeMetadata, updateNodeMetadata } from "../utils/metadata"
import type { MindMapEdge, MindMapEventHooks, MindMapGraph, MindMapNode } from "../types/graph"
import { NodeModal } from "./node-modal"
import { NodeCard } from "./node-card"

interface DragState {
  nodeId: string
  offsetX: number
  offsetY: number
}

const BRANCH_HORIZONTAL_OFFSET = 320
const BRANCH_VERTICAL_GAP = 164
const NODE_WIDTH = 240
const NODE_HEIGHT = 120
const NODE_VERTICAL_PADDING = 24
const MIN_ZOOM = 0.25
const MAX_ZOOM = 1.8
const ZOOM_STEP = 0.1

function buildDepthMap(rootId: string | null, childMap: Map<string, string[]>): Map<string, number> {
  const depthMap = new Map<string, number>()

  if (!rootId) {
    return depthMap
  }

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current || depthMap.has(current.nodeId)) {
      continue
    }

    depthMap.set(current.nodeId, current.depth)

    for (const childId of childMap.get(current.nodeId) ?? []) {
      queue.push({ nodeId: childId, depth: current.depth + 1 })
    }
  }

  return depthMap
}

function getRootId(nodes: MindMapNode[], edges: MindMapEdge[]): string | null {
  const targetIds = new Set(edges.map((edge) => edge.target))
  return nodes.find((node) => !targetIds.has(node.id))?.id ?? null
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

function getDescendantNodeIds(
  nodeId: string,
  childMap: Map<string, string[]>,
): Set<string> {
  const descendantIds = new Set<string>()
  const stack = [nodeId]

  while (stack.length > 0) {
    const currentId = stack.pop()

    if (!currentId || descendantIds.has(currentId)) {
      continue
    }

    descendantIds.add(currentId)

    for (const childId of childMap.get(currentId) ?? []) {
      stack.push(childId)
    }
  }

  return descendantIds
}

function isOverlappingNode(
  candidateX: number,
  candidateY: number,
  node: MindMapNode,
): boolean {
  const verticalPadding = NODE_VERTICAL_PADDING

  return !(
    candidateX + NODE_WIDTH <= node.x ||
    node.x + NODE_WIDTH <= candidateX ||
    candidateY + NODE_HEIGHT + verticalPadding <= node.y ||
    node.y + NODE_HEIGHT + verticalPadding <= candidateY
  )
}

function layoutExpandedBranch(
  graph: MindMapGraph,
  startNodeId: string,
): MindMapGraph {
  const childMap = buildChildMap(graph.edges)
  const positionedNodes = new Map(graph.nodes.map((node) => [node.id, node]))
  const rootNode = getRootNode(graph.nodes, graph.edges)

  // When expanding the root node, re-apply the symmetric left/right fan-out
  if (startNodeId === rootNode?.id) {
    const rootChildIds = childMap.get(rootNode.id) ?? []
    const leftCount = Math.floor(rootChildIds.length / 2)
    const leftIds = rootChildIds.slice(0, leftCount)
    const rightIds = rootChildIds.slice(leftCount)

    const positionSide = (childIds: string[], targetX: number) => {
      const startY = rootNode.y - ((childIds.length - 1) * BRANCH_VERTICAL_GAP) / 2
      childIds.forEach((childId, index) => {
        const child = positionedNodes.get(childId)
        if (child) {
          positionedNodes.set(childId, {
            ...child,
            x: targetX,
            y: startY + index * BRANCH_VERTICAL_GAP,
          })
        }
      })
    }

    positionSide(leftIds, rootNode.x - BRANCH_HORIZONTAL_OFFSET)
    positionSide(rightIds, rootNode.x + BRANCH_HORIZONTAL_OFFSET)

    return {
      nodes: graph.nodes.map((node) => positionedNodes.get(node.id) ?? node),
      edges: graph.edges,
    }
  }

  const branchNodeIds = getDescendantNodeIds(startNodeId, childMap)
  const placedBranchNodeIds = new Set<string>([startNodeId])

  const findAvailablePosition = (
    candidateX: number,
    candidateY: number,
    currentNodeId: string,
    direction: -1 | 1,
  ): { x: number; y: number } => {
    let nextX = candidateX

    while (
      graph.nodes.some((node) => {
        if (node.id === currentNodeId) {
          return false
        }

        const shouldCheckNode =
          !branchNodeIds.has(node.id) || placedBranchNodeIds.has(node.id)

        if (!shouldCheckNode) {
          return false
        }

        const positionedNode = positionedNodes.get(node.id) ?? node
        return isOverlappingNode(nextX, candidateY, positionedNode)
      })
    ) {
      nextX += BRANCH_HORIZONTAL_OFFSET * direction
    }

    return { x: nextX, y: candidateY }
  }

  const positionChildren = (parentId: string, direction: -1 | 1) => {
    const parentNode = positionedNodes.get(parentId)
    const childIds = childMap.get(parentId) ?? []

    if (!parentNode || childIds.length === 0) {
      return
    }

    const startY = parentNode.y - ((childIds.length - 1) * BRANCH_VERTICAL_GAP) / 2

    childIds.forEach((childId, index) => {
      const childNode = positionedNodes.get(childId)

      if (!childNode) {
        return
      }

      const preferredX = parentNode.x + BRANCH_HORIZONTAL_OFFSET * direction
      const preferredY = startY + index * BRANCH_VERTICAL_GAP
      const nextPosition = findAvailablePosition(
        preferredX,
        preferredY,
        childId,
        direction,
      )

      positionedNodes.set(childId, {
        ...childNode,
        x: nextPosition.x,
        y: nextPosition.y,
      })
      placedBranchNodeIds.add(childId)

      positionChildren(childId, direction)
    })
  }

  const startNode = positionedNodes.get(startNodeId)
  const direction = getBranchDirection(startNode, rootNode)
  positionChildren(startNodeId, direction)

  return {
    nodes: graph.nodes.map((node) => positionedNodes.get(node.id) ?? node),
    edges: graph.edges,
  }
}

function getRootNode(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
): MindMapNode | null {
  const rootId = getRootId(nodes, edges)
  return nodes.find((node) => node.id === rootId) ?? null
}

function getBranchDirection(
  node: MindMapNode | undefined,
  rootNode: MindMapNode | null,
): -1 | 1 {
  if (!node || !rootNode) {
    return 1
  }

  return node.x < rootNode.x ? -1 : 1
}

function getVisibleNodeIds(
  rootId: string | null,
  childMap: Map<string, string[]>,
  expandedNodeIds: Set<string>,
): Set<string> {
  const visibleNodeIds = new Set<string>()

  if (!rootId) {
    return visibleNodeIds
  }

  const visit = (nodeId: string) => {
    visibleNodeIds.add(nodeId)

    if (!expandedNodeIds.has(nodeId)) {
      return
    }

    for (const childId of childMap.get(nodeId) ?? []) {
      visit(childId)
    }
  }

  visit(rootId)
  return visibleNodeIds
}

interface GraphViewProps {
  events?: MindMapEventHooks
}

function getFirstName(fullName: string | null | undefined): string | null {
  const normalizedName = fullName?.trim()

  if (!normalizedName) {
    return null
  }

  const firstName = normalizedName.split(/\s+/)[0]
  return firstName || null
}

function getProfileLabel(firstName: string): string {
  return `${firstName}'s Profile`
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function GraphView({ events }: Readonly<GraphViewProps>) {
  const initialRootNodeId = initialProfileGraph.nodes[0]?.id ?? null
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialRootNodeId,
  )
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(initialRootNodeId ? [initialRootNodeId] : []),
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [modalNodeId, setModalNodeId] = useState<string | null>(null)
  const [isSavingAnswers, setIsSavingAnswers] = useState(false)
  const [modalError, setModalError] = useState("")
  const [completionMessage, setCompletionMessage] = useState("")
  const [zoom, setZoom] = useState(1)
  const [nonLeafHint, setNonLeafHint] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Tracks node IDs with an in-flight save to prevent concurrent duplicate requests
  // (e.g. rapid re-submit or network-retry scenario).
  const savingNodesRef = useRef<Set<string>>(new Set())
  const {
    nodes,
    edges,
    hasLoadedStorage,
    updateNode,
    updateGraph,
  } = useGraphState(initialProfileGraph)

  const childMap = useMemo(() => buildChildMap(edges), [edges])
  const rootId = useMemo(() => getRootId(nodes, edges), [edges, nodes])
  const depthMap = useMemo(() => buildDepthMap(rootId, childMap), [childMap, rootId])
  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(rootId, childMap, expandedNodeIds),
    [childMap, expandedNodeIds, rootId],
  )
  const modalNode = nodes.find((node) => node.id === modalNodeId) ?? null
  const modalQuestions = useMemo(
    () => (modalNode ? getQuestionsForNode(modalNode.id) : []),
    [modalNode],
  )
  const modalInitialValues = useMemo(
    () => (modalNode ? getNodeMetadata(modalNode).answers : {}),
    [modalNode],
  )

  useEffect(() => {
    if (!hasLoadedStorage) {
      return
    }

    fetchAllQuestionnaireAnswers().then((allAnswers) => {
      Object.entries(allAnswers).forEach(([nodeId, answers]) => {
        updateNode(nodeId, (node) =>
          updateNodeMetadata(node, {
            answers,
            completion: { state: Object.keys(answers).length > 0 ? "completed" : "incomplete" },
            savedAt: new Date().toISOString(),
          })
        )
      })
    }).catch(() => {
      // silently ignore — user may not have saved any answers yet
    })
  }, [hasLoadedStorage, updateNode])

  useEffect(() => {
    if (!hasLoadedStorage || !rootId) {
      return
    }

    let isMounted = true

    const loadProfileName = async () => {
      try {
        const profile = await fetchProfile()
        const firstName = getFirstName(profile?.name)
        const profileLabel = firstName ? getProfileLabel(firstName) : null

        if (!isMounted || !profileLabel) {
          return
        }

        updateNode(rootId, (node) => {
          if (node.label === profileLabel) {
            return node
          }

          return {
            ...node,
            label: profileLabel,
          }
        })
      } catch {
        // Leave the default root label in place when profile data is unavailable.
      }
    }

    void loadProfileName()

    return () => {
      isMounted = false
    }
  }, [hasLoadedStorage, rootId, updateNode])

  useEffect(() => {
    if (!dragState) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const bounds = canvas.getBoundingClientRect()
      const nextX = (event.clientX - bounds.left) / zoom - dragState.offsetX
      const nextY = (event.clientY - bounds.top) / zoom - dragState.offsetY

      updateNode(dragState.nodeId, (node) => ({
        ...node,
        x: nextX,
        y: nextY,
      }))
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState, updateNode, zoom])

  const visibleEdges = edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  )
  const visibleNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds],
  )
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  )

  const canvasWidth =
    Math.max(...nodes.map((node) => node.x + 320), 920)
  const canvasHeight =
    Math.max(...nodes.map((node) => node.y + 200), 720)

  const zoomedCanvasWidth = canvasWidth * zoom
  const zoomedCanvasHeight = canvasHeight * zoom

  useEffect(() => {
    if (!selectedNodeId) {
      return
    }

    const nodeElement = nodeRefs.current[selectedNodeId]
    nodeElement?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    })
    nodeElement?.focus()
  }, [selectedNodeId])

  useEffect(() => {
    if (!completionMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCompletionMessage("")
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [completionMessage])

  useEffect(() => {
    if (!nonLeafHint) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNonLeafHint(null)
    }, 2400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [nonLeafHint])

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    const node = nodesById.get(nodeId)
    if (node) {
      emitNodeClick(events, node)
    }

    const nodeDepth = depthMap.get(nodeId) ?? 0
    if (nodeDepth >= 2) {
      setModalError("")
      setModalNodeId(nodeId)
    } else {
      const hasChildren = (childMap.get(nodeId) ?? []).length > 0
      if (hasChildren) {
        setNonLeafHint("Click a sub-topic to explore details, or use the expand button to show children.")
      } else {
        setNonLeafHint("Click a sub-topic to explore details.")
      }
    }
  }, [childMap, depthMap, events, nodesById])

  const handleToggleExpand = useCallback((nodeId: string) => {
    const isCurrentlyExpanded = expandedNodeIds.has(nodeId)

    if (!isCurrentlyExpanded) {
      updateGraph((currentGraph) => layoutExpandedBranch(currentGraph, nodeId))
    }

    setExpandedNodeIds((currentExpanded) => {
      const nextExpanded = new Set(currentExpanded)

      if (nextExpanded.has(nodeId)) {
        nextExpanded.delete(nodeId)
      } else {
        nextExpanded.add(nodeId)
      }

      return nextExpanded
    })
  }, [expandedNodeIds, updateGraph])

  const handleDragStart = useCallback((
    event: ReactMouseEvent<HTMLDivElement>,
    nodeId: string,
  ) => {
    const canvas = canvasRef.current
    const node = nodesById.get(nodeId)

    if (!canvas || !node) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const bounds = canvas.getBoundingClientRect()
    setSelectedNodeId(nodeId)
    setDragState({
      nodeId,
      offsetX: (event.clientX - bounds.left) / zoom - node.x,
      offsetY: (event.clientY - bounds.top) / zoom - node.y,
    })
  }, [nodesById, zoom])

  const handleZoomIn = useCallback(() => {
    setZoom((currentZoom) => clampZoom(currentZoom + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((currentZoom) => clampZoom(currentZoom - ZOOM_STEP))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  const handleCanvasWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return
    }

    event.preventDefault()

    setZoom((currentZoom) =>
      clampZoom(currentZoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)),
    )
  }, [])

  const handleModalSubmit = async (answers: Record<string, MindMapAnswerValue>) => {
    if (!modalNode) {
      return
    }

    if (savingNodesRef.current.has(modalNode.id)) {
      return
    }

    savingNodesRef.current.add(modalNode.id)
    setIsSavingAnswers(true)
    setModalError("")

    try {
      await saveNodeAnswers(modalNode.id, answers)

      updateGraph((currentGraph) => {
        const nextGraph = propagateCompletionState(
          {
            ...currentGraph,
            nodes: currentGraph.nodes.map((node) =>
              node.id === modalNode.id
                ? updateNodeMetadata(node, {
                    answers,
                    completion: {
                      state: "completed",
                    },
                    savedAt: new Date().toISOString(),
                  })
                : node,
            ),
          },
          modalNode.id,
        )

        const completedNode = nextGraph.nodes.find((node) => node.id === modalNode.id)
        if (completedNode) {
          emitNodeCompletion(events, completedNode)
          emitNodeUpdate(events, completedNode)
        }

        return nextGraph
      })

      setCompletionMessage(`Saved ${modalNode.label}`)
      setModalNodeId(null)
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Unable to save node answers.",
      )
    } finally {
      savingNodesRef.current.delete(modalNode.id)
      setIsSavingAnswers(false)
    }
  }

  return (
    <PageShell fullWidth>
      <main style={{ display: "grid", gap: 16, minHeight: "calc(100vh - 48px)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
              Personal Profile Mind Map
            </h1>
            <p style={{ color: "#475569", fontSize: 14 }}>
              Select a node to edit it, expand or collapse children, and drag cards to reposition them.
            </p>
            {completionMessage ? (
              <div className="mindmap-completion-feedback">{completionMessage}</div>
            ) : null}
            {nonLeafHint ? (
              <div
                role="status"
                aria-live="polite"
                className="mindmap-nonleaf-hint"
              >
                {nonLeafHint}
              </div>
            ) : null}
          </div>
          <div style={{ flexShrink: 0, paddingTop: 4 }}>
            <UXModeSwitcher currentMode="mindmap" variant="segmented" />
          </div>
        </header>

        <section
          style={{
            minHeight: 0,
          }}
        >
          <div style={{ position: "relative" }}>
            {nodes.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <button type="button" onClick={handleZoomOut} style={zoomButtonStyle}>
                  -
                </button>
                <button type="button" onClick={handleZoomReset} style={zoomButtonStyle}>
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" onClick={handleZoomIn} style={zoomButtonStyle}>
                  +
                </button>
              </div>
            )}
          <div
            ref={canvasRef}
            className="mindmap-canvas"
            onWheel={handleCanvasWheel}
            style={{
              ...canvasFrameStyle,
              height: "calc(100vh - 200px)",
            }}
          >
            {nodes.length === 0 ? (
              <div className="mindmap-empty-state">
                <div style={{ display: "grid", gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                    No nodes yet
                  </h3>
                  <p style={{ color: "#475569", fontSize: 14 }}>
                    The mind map is empty. Add a node to start building your profile.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: zoomedCanvasWidth,
                  height: zoomedCanvasHeight,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <svg
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                  >
                    {visibleEdges.map((edge) => {
                      const source = nodesById.get(edge.source)
                      const target = nodesById.get(edge.target)

                      if (!source || !target) {
                        return null
                      }

                      return (
                        <line
                          key={`${edge.source}-${edge.target}`}
                          x1={target.x < source.x ? source.x : source.x + NODE_WIDTH}
                          y1={source.y + 72}
                          x2={target.x < source.x ? target.x + NODE_WIDTH : target.x}
                          y2={target.y + 72}
                          stroke="#94a3b8"
                          strokeWidth="2"
                        />
                      )
                    })}
                  </svg>

                  {visibleNodes.map((node) => {
                    const hasChildren = (childMap.get(node.id) ?? []).length > 0

                    return (
                      <div
                        key={node.id}
                        ref={(element) => {
                          nodeRefs.current[node.id] = element
                        }}
                        tabIndex={-1}
                        className="mindmap-node"
                        data-visible="true"
                        style={{
                          position: "absolute",
                          left: node.x,
                          top: node.y,
                        }}
                      >
                        <NodeCard
                          node={node}
                          isSelected={selectedNodeId === node.id}
                          hasChildren={hasChildren}
                          isExpanded={expandedNodeIds.has(node.id)}
                          onSelect={handleNodeSelect}
                          onToggleExpand={handleToggleExpand}
                          onDragStart={handleDragStart}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        </section>
      </main>

      <NodeModal
        node={modalNode}
        isOpen={modalNode !== null}
        questions={modalQuestions}
        initialValues={modalInitialValues}
        isSaving={isSavingAnswers}
        error={modalError}
        onClose={() => {
          setModalNodeId(null)
          setModalError("")
        }}
        onSubmit={handleModalSubmit}
      />
    </PageShell>
  )
}

const canvasFrameStyle: CSSProperties = {
  overflow: "auto",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  backgroundColor: "#f8fafc",
  backgroundImage:
    "linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  padding: 24,
}

const zoomButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#0f172a",
  padding: "6px 10px",
  fontSize: 12,
  minWidth: 44,
}
