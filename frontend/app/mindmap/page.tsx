import type { Metadata } from "next"

import "./styles/mindmap.css"

import { GraphView } from "./components/graph-view"
import { MindMapModeGuard } from "./components/mindmap-mode-guard"

export const metadata: Metadata = {
  title: "Profile Questions",
}

export default function MindMapPage() {
  return (
    <MindMapModeGuard>
      <GraphView />
    </MindMapModeGuard>
  )
}
