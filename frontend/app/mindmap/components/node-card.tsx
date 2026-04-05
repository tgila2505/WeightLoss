"use client"

import { memo } from "react"
import type { MouseEvent } from "react"

import { getCompletionState, getNodeMetadata } from "../utils/metadata"
import type { MindMapNode } from "../types/graph"

interface NodeCardProps {
  node: MindMapNode
  isSelected: boolean
  hasChildren: boolean
  isExpanded: boolean
  onSelect: (nodeId: string) => void
  onToggleExpand: (nodeId: string) => void
  onLabelChange: (nodeId: string, value: string) => void
  onDragStart: (event: MouseEvent<HTMLDivElement>, nodeId: string) => void
}

function getStatusColor(node: MindMapNode): string {
  const metadata = getNodeMetadata(node)

  if (metadata.completion.state === "partial") {
    return "#d97706"
  }

  if (metadata.completion.state === "completed") {
    return "#16a34a"
  }

  if (typeof metadata.extensions.status === "string") {
    const status = metadata.extensions.status.toLowerCase()

    if (status === "active") {
      return "#16a34a"
    }

    if (status === "warning") {
      return "#d97706"
    }
  }

  switch (node.type) {
    case "profile":
      return "#2563eb"
    case "category":
      return "#7c3aed"
    case "goal":
      return "#dc2626"
    case "habit":
      return "#059669"
    case "activity":
      return "#ea580c"
    case "attribute":
      return "#475569"
    default:
      return "#64748b"
  }
}

function getMetadataEntries(node: MindMapNode): Array<[string, string]> {
  const metadata = getNodeMetadata(node)

  return Object.entries(metadata.extensions)
    .filter(([, value]) => value !== undefined && value !== null)
    .slice(0, 2)
    .map(([key, value]) => [key, String(value)])
}

function NodeCardComponent({
  node,
  isSelected,
  hasChildren,
  isExpanded,
  onSelect,
  onToggleExpand,
  onLabelChange,
  onDragStart,
}: Readonly<NodeCardProps>) {
  const metadataEntries = getMetadataEntries(node)
  const completionState = getCompletionState(node)
  const isCompleted = completionState === "completed"
  const isPartial = completionState === "partial"
  const isReadOnlyLabel = node.type === "profile"
  const showTypeLabel = node.type !== "category" && node.type !== "attribute"
  const toggleSymbol = hasChildren
    ? isExpanded
      ? "\u2212"
      : "\u25a1"
    : "\u25a1"

  return (
    <div
      className="mindmap-node-card"
      onMouseDown={(event) => onDragStart(event, node.id)}
      onClick={() => onSelect(node.id)}
      tabIndex={0}
      style={{
        width: 240,
        border: `2px solid ${isSelected ? "#2563eb" : "#cbd5e1"}`,
        borderRadius: 12,
        backgroundColor: isSelected ? "#f8fbff" : "#ffffff",
        boxShadow: isSelected
          ? "0 10px 30px rgba(37, 99, 235, 0.18)"
          : "0 8px 20px rgba(15, 23, 42, 0.08)",
        padding: 12,
        cursor: "grab",
        outline: isSelected ? "2px solid rgba(37, 99, 235, 0.16)" : "none",
        outlineOffset: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: getStatusColor(node),
              flexShrink: 0,
            }}
          />
          {showTypeLabel ? (
            <span style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>
              {node.type ?? "node"}
            </span>
          ) : null}
          {isCompleted ? (
            <span
              style={{
                fontSize: 11,
                color: "#166534",
                backgroundColor: "#dcfce7",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              Completed
            </span>
          ) : isPartial ? (
            <span
              style={{
                fontSize: 11,
                color: "#92400e",
                backgroundColor: "#fef3c7",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              Partial
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()

            if (hasChildren) {
              onToggleExpand(node.id)
            }
          }}
          aria-label={hasChildren ? (isExpanded ? "Collapse branch" : "Expand branch") : "No child nodes"}
          disabled={!hasChildren}
          style={{
            border: "none",
            backgroundColor: "transparent",
            color: hasChildren ? "#0f172a" : "#94a3b8",
            padding: "0 2px",
            fontSize: 16,
            lineHeight: 1,
            cursor: hasChildren ? "pointer" : "default",
          }}
        >
          {toggleSymbol}
        </button>
      </div>

      {isReadOnlyLabel ? (
        <div
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 15,
            fontWeight: 600,
            color: "#0f172a",
            backgroundColor: "#ffffff",
          }}
        >
          {node.label}
        </div>
      ) : (
        <input
          value={node.label}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onLabelChange(node.id, event.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 15,
            fontWeight: 600,
            color: "#0f172a",
          }}
        />
      )}

      {metadataEntries.length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
          {metadataEntries.map(([key, value]) => (
            <div
              key={`${node.id}-${key}`}
              style={{ fontSize: 12, color: "#475569", display: "flex", gap: 4 }}
            >
              <span style={{ fontWeight: 600 }}>{key}:</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const NodeCard = memo(NodeCardComponent)
