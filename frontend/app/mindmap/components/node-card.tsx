"use client"

import { memo } from "react"
import type { CSSProperties, MouseEvent } from "react"

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
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onDragStart: (event: MouseEvent<HTMLButtonElement>, nodeId: string) => void
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
  onAddChild,
  onDelete,
  onDragStart,
}: Readonly<NodeCardProps>) {
  const metadataEntries = getMetadataEntries(node)
  const completionState = getCompletionState(node)
  const isCompleted = completionState === "completed"
  const isPartial = completionState === "partial"

  return (
    <div
      className="mindmap-node-card"
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
        cursor: "pointer",
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
          <span style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>
            {node.type ?? "node"}
          </span>
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
          onMouseDown={(event) => onDragStart(event, node.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Drag ${node.label}`}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            backgroundColor: "#f8fafc",
            color: "#334155",
            padding: "2px 8px",
            cursor: "grab",
          }}
        >
          Drag
        </button>
      </div>

      <input
        value={node.label}
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

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAddChild(node.id)
          }}
          style={buttonStyle}
        >
          Add Child
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(node.id)
          }}
          style={buttonStyle}
        >
          Delete
        </button>

        {hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleExpand(node.id)
            }}
            style={buttonStyle}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export const NodeCard = memo(NodeCardComponent)

const buttonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  padding: "6px 10px",
  fontSize: 12,
  transition: "background-color 180ms ease, border-color 180ms ease",
}
