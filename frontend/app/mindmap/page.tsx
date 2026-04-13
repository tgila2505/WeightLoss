import type { Metadata } from "next"
import { Suspense } from "react"

import "./styles/mindmap.css"

import { GraphView } from "./components/graph-view"
import { MindMapModeGuard } from "./components/mindmap-mode-guard"

export const metadata: Metadata = {
  title: "Profile Questions",
}

export default function MindMapPage() {
  return (
    <Suspense>
      <MindMapModeGuard>
        <GraphView />
      </MindMapModeGuard>
    </Suspense>
  )
}
