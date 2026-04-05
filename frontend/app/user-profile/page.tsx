"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

import { PageShell } from "@/app/components/page-shell"
import { generateMasterProfile, fetchMasterProfile } from "@/lib/api-client"

interface ProfileState {
  profileText: string
  generatedAt: string
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchMasterProfile()
      .then((data) => {
        if (data) {
          setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError("")
    try {
      const data = await generateMasterProfile()
      setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
    } catch {
      setError("Failed to generate profile. Make sure the AI service is running.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  const formattedDate = profile?.generatedAt
    ? new Date(profile.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <PageShell>
      <div style={containerStyle} className="print-container">
        {/* Header */}
        <div style={headerStyle} className="no-print">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            User Profile
          </h1>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={generateButtonStyle}
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Meta strip */}
        {formattedDate && (
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }} className="no-print">
            Last generated: {formattedDate}
          </p>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 14, color: "#dc2626" }} className="no-print">
            {error}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <p style={{ fontSize: 14, color: "#64748b" }}>Loading…</p>
        )}

        {/* Empty state */}
        {!isLoading && !profile && !error && (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
              No profile generated yet.
            </p>
            <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
              Complete questionnaire sections in Profile Questions, then click Generate.
            </p>
          </div>
        )}

        {/* Profile content */}
        {profile && (
          <div style={profileContentStyle} className="profile-text">
            <MarkdownRenderer text={profile.profileText} />
          </div>
        )}

        {/* Print footer */}
        {profile && (
          <div style={footerStyle} className="no-print">
            <button type="button" onClick={handlePrint} style={printButtonStyle}>
              Print / Export PDF
            </button>
          </div>
        )}

        {/* Print-only styles */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; max-width: 100% !important; }
            .profile-text { font-size: 12pt; line-height: 1.6; }
            h2 { page-break-before: auto; }
          }
        `}</style>
      </div>
    </PageShell>
  )
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginTop: 20, marginBottom: 6 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} style={{ fontSize: 14, color: "#334155", marginLeft: 16, marginBottom: 4 }}>
          {line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}
        </li>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />)
    } else {
      elements.push(
        <p key={key++} style={{ fontSize: 14, color: "#334155", margin: "4px 0" }}>
          {line}
        </p>
      )
    }
  }

  return <div>{elements}</div>
}

const containerStyle: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "24px 20px 80px",
  display: "grid",
  gap: 16,
}

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

const generateButtonStyle: CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}

const emptyStateStyle: CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  borderRadius: 12,
  border: "1px dashed #cbd5e1",
  backgroundColor: "#f8fafc",
}

const profileContentStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  padding: "24px 28px",
}

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  position: "sticky",
  bottom: 16,
}

const printButtonStyle: CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "1px solid #475569",
  backgroundColor: "#f8fafc",
  color: "#475569",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
}
