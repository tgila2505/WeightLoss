"use client"

import { memo } from "react"
import type { MouseEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { MindMapNode } from "../types/graph"
import { getCompletionState, getNodeMetadata } from "../utils/metadata"

interface NodeCardProps {
  node: MindMapNode
  isSelected: boolean
  hasChildren: boolean
  isExpanded: boolean
  onSelect: (nodeId: string) => void
  onToggleExpand: (nodeId: string) => void
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
  onDragStart,
}: Readonly<NodeCardProps>) {
  const metadataEntries = getMetadataEntries(node)
  const completionState = getCompletionState(node)
  const isCompleted = completionState === "completed"
  const isPartial = completionState === "partial"
  const showTypeLabel = node.type !== "category" && node.type !== "attribute"
  const toggleSymbol = hasChildren
    ? isExpanded
      ? "\u2212"
      : "\u25a1"
    : "\u25a1"

  return (
    <Card
      className={cn(
        "w-[240px] cursor-grab border-2 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] outline-offset-2 transition-colors",
        isSelected
          ? "border-blue-600 bg-blue-50/40 shadow-[0_10px_30px_rgba(37,99,235,0.18)] outline outline-2 outline-blue-200"
          : "border-slate-300"
      )}
      onMouseDown={(event) => onDragStart(event, node.id)}
      onClick={() => onSelect(node.id)}
      tabIndex={0}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: getStatusColor(node) }}
          />
          {showTypeLabel ? (
            <span className="text-xs capitalize text-slate-600">
              {node.type ?? "node"}
            </span>
          ) : null}
          {isCompleted ? (
            <Badge className="bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100">
              Completed
            </Badge>
          ) : isPartial ? (
            <Badge className="bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100">
              Partial
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()

            if (hasChildren) {
              onToggleExpand(node.id)
            }
          }}
          aria-label={hasChildren ? (isExpanded ? "Collapse branch" : "Expand branch") : "No child nodes"}
          disabled={!hasChildren}
          className="h-7 min-w-7 px-1 text-base text-slate-900 disabled:text-slate-400"
        >
          {toggleSymbol}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-semibold text-slate-900">
          {node.label}
        </div>
        {isCompleted ? (
          <span
            title="Answers saved"
            className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-600"
          />
        ) : null}
      </div>

      {metadataEntries.length > 0 ? (
        <div className="mt-2.5 grid gap-1">
          {metadataEntries.map(([key, value]) => (
            <div
              key={`${node.id}-${key}`}
              className="flex gap-1 text-xs text-slate-600"
            >
              <span className="font-semibold">{key}:</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export const NodeCard = memo(NodeCardComponent)
