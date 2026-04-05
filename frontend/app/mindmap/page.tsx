import type { Metadata } from "next"

import "./styles/mindmap.css"

import { GraphView } from "./components/graph-view"

export const metadata: Metadata = {
  title: "User Profile",
}

export default function MindMapPage() {
  return <GraphView />
}
