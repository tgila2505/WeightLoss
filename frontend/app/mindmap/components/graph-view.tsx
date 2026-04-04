"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import { PageShell } from "@/app/components/page-shell"
import {
  fetchMindMapAnswers,
  saveMindMapAnswers,
  type MindMapAnswerValue,
} from "@/lib/api-client"
import { initialProfileGraph } from "@/lib/graph/transformer"

import { useGraphState } from "../hooks/useGraphState"
import { getQuestionsForNode } from "../schema/questions"
import { propagateCompletionState, syncCompletionState } from "../utils/completion"
import { emitNodeClick, emitNodeCompletion, emitNodeUpdate } from "../utils/events"
import { getNodeMetadata, updateNodeMetadata } from "../utils/metadata"
import type { MindMapEdge, MindMapEventHooks, MindMapNode } from "../types/graph"
import { NodeModal } from "./node-modal"
import { NodeCard } from "./node-card"

interface DragState {
  nodeId: string
  offsetX: number
  offsetY: number
}

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

function createChildNode(
  parent: MindMapNode,
  nextId: string,
  siblingIndex: number,
): MindMapNode {
  const verticalOffset = siblingIndex * 164

  return {
    id: nextId,
    label: "New Node",
    type: "attribute",
    x: parent.x + 320,
    y: parent.y + 100 + verticalOffset,
    metadata: {
      completion: {
        state: "incomplete",
      },
      answers: {},
      savedAt: null,
      extensions: {
        createdFrom: parent.id,
        status: "active",
      },
    },
  }
}

function createNodeId(nodes: MindMapNode[]): string {
  const existingIds = new Set(nodes.map((node) => node.id))
  let nextIndex = nodes.length + 1

  while (existingIds.has(`node-${nextIndex}`)) {
    nextIndex += 1
  }

  return `node-${nextIndex}`
}

function getDescendantIds(nodeId: string, childMap: Map<string, string[]>): Set<string> {
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

interface GraphViewProps {
  events?: MindMapEventHooks
}

export function GraphView({ events }: Readonly<GraphViewProps>) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialProfileGraph.nodes[0]?.id ?? null,
  )
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(initialProfileGraph.nodes.map((node) => node.id)),
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [modalNodeId, setModalNodeId] = useState<string | null>(null)
  const [isSavingAnswers, setIsSavingAnswers] = useState(false)
  const [modalError, setModalError] = useState("")
  const [completionMessage, setCompletionMessage] = useState("")
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
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

    let isMounted = true

    const loadSavedAnswers = async () => {
      try {
        const records = await fetchMindMapAnswers()

        if (!isMounted || records.length === 0) {
          return
        }

        updateGraph((currentGraph) =>
          syncCompletionState({
            ...currentGraph,
            nodes: currentGraph.nodes.map((node) => {
              const record = records.find((item) => item.nodeId === node.id)

              if (!record) {
                return node
              }

              return {
                ...updateNodeMetadata(node, {
                  answers: record.answers,
                  completion: {
                    state: record.completed ? "completed" : "incomplete",
                  },
                  savedAt: record.savedAt,
                }),
              }
            }),
          }),
        )
      } catch {
        if (isMounted) {
          setModalError("Unable to load saved node answers.")
        }
      }
    }

    void loadSavedAnswers()

    return () => {
      isMounted = false
    }
  }, [hasLoadedStorage])

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
      const nextX = event.clientX - bounds.left - dragState.offsetX
      const nextY = event.clientY - bounds.top - dragState.offsetY

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
  }, [dragState])

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

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const canvasWidth =
    Math.max(...nodes.map((node) => node.x + 320), 920)
  const canvasHeight =
    Math.max(...nodes.map((node) => node.y + 200), 720)

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
    }, 1800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [completionMessage])

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    updateNode(nodeId, (node) => {
      const nextNode = {
        ...node,
        label,
      }

      emitNodeUpdate(events, nextNode)
      return nextNode
    })
  }, [events, updateNode])

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
    }
  }, [depthMap, events, nodesById])

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((currentExpanded) => {
      const nextExpanded = new Set(currentExpanded)

      if (nextExpanded.has(nodeId)) {
        nextExpanded.delete(nodeId)
      } else {
        nextExpanded.add(nodeId)
      }

      return nextExpanded
    })
  }, [])

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodesById.get(parentId)

    if (!parentNode) {
      return
    }

    updateGraph((currentGraph) => {
      const nextId = createNodeId(currentGraph.nodes)
      const siblingIndex = currentGraph.edges.filter(
        (edge) => edge.source === parentNode.id,
      ).length
      const newNode = createChildNode(parentNode, nextId, siblingIndex)

      return syncCompletionState({
        nodes: [...currentGraph.nodes, newNode],
        edges: [
          ...currentGraph.edges,
          {
            source: parentNode.id,
            target: newNode.id,
          },
        ],
      })
    })

    setExpandedNodeIds((currentExpanded) => {
      const nextExpanded = new Set(currentExpanded)
      nextExpanded.add(parentNode.id)
      return nextExpanded
    })

    setSelectedNodeId(parentNode.id)
  }, [nodesById, updateGraph])

  const handleDelete = useCallback((nodeId: string) => {
    if (nodeId === rootId) {
      return
    }

    const nodeIdsToRemove = getDescendantIds(nodeId, childMap)

    updateGraph((currentGraph) =>
      syncCompletionState({
        nodes: currentGraph.nodes.filter((node) => !nodeIdsToRemove.has(node.id)),
        edges: currentGraph.edges.filter(
          (edge) =>
            !nodeIdsToRemove.has(edge.source) && !nodeIdsToRemove.has(edge.target),
        ),
      }),
    )

    setExpandedNodeIds((currentExpanded) => {
      const nextExpanded = new Set(currentExpanded)

      for (const nodeId of nodeIdsToRemove) {
        nextExpanded.delete(nodeId)
      }

      return nextExpanded
    })

    setSelectedNodeId(rootId)
  }, [childMap, rootId, updateGraph])

  const handleDragStart = useCallback((
    event: ReactMouseEvent<HTMLButtonElement>,
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
      offsetX: event.clientX - bounds.left - node.x,
      offsetY: event.clientY - bounds.top - node.y,
    })
  }, [nodesById])

  const handleModalSubmit = async (answers: Record<string, MindMapAnswerValue>) => {
    if (!modalNode) {
      return
    }

    setIsSavingAnswers(true)
    setModalError("")

    try {
      const record = await saveMindMapAnswers({
        nodeId: modalNode.id,
        answers,
        completed: true,
      })

      updateGraph((currentGraph) => {
        const nextGraph = propagateCompletionState(
          {
            ...currentGraph,
            nodes: currentGraph.nodes.map((node) =>
              node.id === modalNode.id
                ? updateNodeMetadata(node, {
                    answers: record.answers,
                    completion: {
                      state: "completed",
                    },
                    savedAt: record.savedAt,
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
      setIsSavingAnswers(false)
    }
  }

  return (
    <PageShell fullWidth>
      <main style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
            Personal Profile Mind Map
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Select a node to edit it, expand or collapse children, add a child, delete a
            branch, or drag cards to reposition them.
          </p>
          {completionMessage ? (
            <div className="mindmap-completion-feedback">{completionMessage}</div>
          ) : null}
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <aside
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: 16,
              minHeight: 180,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
              Selected Node
            </h2>

            {selectedNode ? (
              <div style={{ display: "grid", gap: 8, fontSize: 14, color: "#334155" }}>
                <div>
                  <strong>ID:</strong> {selectedNode.id}
                </div>
                <div>
                  <strong>Label:</strong> {selectedNode.label}
                </div>
                <div>
                  <strong>Type:</strong> {selectedNode.type ?? "node"}
                </div>
                <div>
                  <strong>Position:</strong> {Math.round(selectedNode.x)},{" "}
                  {Math.round(selectedNode.y)}
                </div>
              </div>
            ) : (
              <p style={{ color: "#64748b", fontSize: 14 }}>Select a node to inspect it.</p>
            )}
          </aside>

          <div
            ref={canvasRef}
            className="mindmap-canvas"
            style={canvasFrameStyle}
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
                  width: canvasWidth,
                  height: canvasHeight,
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
                        x1={source.x + 240}
                        y1={source.y + 72}
                        x2={target.x}
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
                        onLabelChange={handleLabelChange}
                        onAddChild={handleAddChild}
                        onDelete={handleDelete}
                        onDragStart={handleDragStart}
                      />
                    </div>
                  )
                })}
              </div>
            )}
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
  minHeight: 720,
  overflow: "auto",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  backgroundColor: "#f8fafc",
  backgroundImage:
    "linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  padding: 24,
}
