"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

import { useRouter } from "next/navigation"

import { PageShell } from "@/app/components/page-shell"
import { generateMasterProfile, fetchMasterProfile, fetchReferralCode, fetchReferralStats, type ReferralStats } from "@/lib/api-client"

interface ProfileState {
  profileText: string
  generatedAt: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    fetchMasterProfile()
      .then((data) => {
        if (data) {
          setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === "SESSION_EXPIRED") {
          setSessionExpired(true)
        } else {
          setError("Failed to load profile.")
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError("")
    setSessionExpired(false)
    try {
      const data = await generateMasterProfile()
      setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        setSessionExpired(true)
      } else {
        setError("Failed to generate profile. Make sure the AI service is running.")
      }
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
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              User Profile
            </h1>
            {formattedDate && (
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                Last generated: {formattedDate}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={profile ? regenerateButtonStyle : generateButtonStyle}
          >
            {isGenerating
              ? (profile ? "Re-generating…" : "Generating…")
              : (profile ? "Re-generate" : "Generate")}
          </button>
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div style={sessionBannerStyle} className="no-print">
            <span>Your session has expired. Please log in again to continue.</span>
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={sessionLoginButtonStyle}
            >
              Log in
            </button>
          </div>
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
          <div style={{ ...profileContentStyle, opacity: isGenerating ? 0.45 : 1, transition: "opacity 0.3s" }} className="profile-text">
            {isGenerating && (
              <p style={{ fontSize: 13, color: "#2563eb", marginBottom: 16, fontStyle: "italic" }}>
                Re-generating with your latest lab results, weight trends, and health data…
              </p>
            )}
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

        {/* Referral code */}
        <div className="no-print">
          <ReferralCard />
        </div>

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

function ReferralCard() {
  const [referralLink, setReferralLink] = useState<string | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetchReferralCode()
      .then((ref) => {
        if (!isMounted) return
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        setReferralLink(`${origin}/referral/${ref.code}`)
        return fetchReferralStats()
      })
      .then((s) => { if (isMounted && s) setStats(s) })
      .catch(() => { if (isMounted) setLoadError(true) })
    return () => { isMounted = false }
  }, [])

  async function handleCopy() {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadError) return null

  return (
    <div style={referralCardStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
        Refer a friend
      </h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
        Share your link and earn rewards when friends sign up.
      </p>

      {referralLink ? (
        <>
          <div style={referralLinkRowStyle}>
            <span style={{ fontSize: 13, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {referralLink}
            </span>
            <button type="button" onClick={handleCopy} style={copyButtonStyle}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {stats && (
            <div style={referralStatsRowStyle}>
              <div style={referralStatStyle}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{stats.clicks}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Clicks</span>
              </div>
              <div style={referralStatStyle}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{stats.signups}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Signups</span>
              </div>
              <div style={referralStatStyle}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{stats.rewards_earned}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Rewards</span>
              </div>
            </div>
          )}

          {stats?.premium_until && (
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              Premium until{" "}
              {new Date(stats.premium_until).toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>
          )}
        </>
      ) : (
        <div style={{ height: 40, borderRadius: 8, backgroundColor: "#f1f5f9" }} />
      )}
    </div>
  )
}

const referralCardStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  padding: "20px 24px",
}

const referralLinkRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  padding: "8px 12px",
  marginBottom: 12,
}

const copyButtonStyle: CSSProperties = {
  flexShrink: 0,
  padding: "4px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

const referralStatsRowStyle: CSSProperties = {
  display: "flex",
  gap: 24,
}

const referralStatStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
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

const regenerateButtonStyle: CSSProperties = {
  ...generateButtonStyle,
  backgroundColor: "#ffffff",
  color: "#2563eb",
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

const sessionBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 16px",
  borderRadius: 8,
  backgroundColor: "#fffbeb",
  border: "1px solid #fbbf24",
  fontSize: 14,
  color: "#92400e",
}

const sessionLoginButtonStyle: CSSProperties = {
  padding: "4px 14px",
  borderRadius: 6,
  border: "1px solid #d97706",
  backgroundColor: "#ffffff",
  color: "#b45309",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
}
