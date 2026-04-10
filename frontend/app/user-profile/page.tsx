"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, Printer, Copy, Check } from "lucide-react"

import { PageShell } from "@/app/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateMasterProfile, fetchMasterProfile } from "@/lib/api-client"
import { useReferral } from "@/hooks/use-referral"

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
      <div className="mx-auto grid max-w-3xl gap-4 px-5 pb-20 pt-6 print-container">

        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Profile</h1>
            {formattedDate && (
              <p className="mt-1 text-sm text-slate-500">Last generated: {formattedDate}</p>
            )}
          </div>
          <Button
            variant={profile ? "outline" : "default"}
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {profile ? "Re-generating…" : "Generating…"}
              </>
            ) : (
              <>
                {profile && <RefreshCw className="mr-2 h-4 w-4" />}
                {profile ? "Re-generate" : "Generate"}
              </>
            )}
          </Button>
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div className="no-print flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>Your session has expired. Please log in again to continue.</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/login")}
            >
              Log in
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="no-print text-sm text-red-600">{error}</p>
        )}

        {/* Loading */}
        {isLoading && (
          <p className="text-sm text-slate-500">Loading…</p>
        )}

        {/* Empty state */}
        {!isLoading && !profile && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-600">No profile generated yet.</p>
            <p className="mt-2 text-sm text-slate-400">
              Complete questionnaire sections in Profile Questions, then click Generate.
            </p>
          </div>
        )}

        {/* Profile content */}
        {profile && (
          <Card
            className="transition-opacity duration-300"
            style={{ opacity: isGenerating ? 0.45 : 1 }}
          >
            <CardContent className="p-7 profile-text">
              {isGenerating && (
                <p className="mb-4 text-sm italic text-blue-600">
                  Re-generating with your latest lab results, weight trends, and health data…
                </p>
              )}
              <MarkdownRenderer text={profile.profileText} />
            </CardContent>
          </Card>
        )}

        {/* Print footer */}
        {profile && (
          <div className="no-print sticky bottom-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Export PDF
            </Button>
          </div>
        )}

        {/* Referral card */}
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

/** Splits a string on **bold** markers and returns an array of strings and <strong> nodes. */
function renderInline(content: string, baseKey: number): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return content
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${baseKey}-b${i}`}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      // H13 fix (M16): h1
      elements.push(
        <h1 key={key++} className="mb-2 mt-6 text-lg font-bold text-slate-900">
          {renderInline(line.slice(2), key)}
        </h1>
      )
      i++
    } else if (line.startsWith("## ") && !line.startsWith("### ")) {
      // existing h2 + M15 inline bold
      elements.push(
        <h2 key={key++} className="mb-1.5 mt-5 text-base font-bold text-slate-900">
          {renderInline(line.slice(3), key)}
        </h2>
      )
      i++
    } else if (line.startsWith("### ")) {
      // M16: h3
      elements.push(
        <h3 key={key++} className="mb-1 mt-4 text-sm font-semibold text-slate-800">
          {renderInline(line.slice(4), key)}
        </h3>
      )
      i++
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // H13: collect consecutive list items into a single <ul>
      const listItems: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        const itemKey = key++
        listItems.push(
          <li key={itemKey} className="ml-4 mb-1 text-sm text-slate-700">
            {renderInline(lines[i].slice(2), itemKey)}
          </li>
        )
        i++
      }
      elements.push(
        <ul key={key++} className="list-disc">
          {listItems}
        </ul>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />)
      i++
    } else {
      // M15: apply inline bold to plain paragraphs too
      elements.push(
        <p key={key++} className="my-1 text-sm text-slate-700">
          {renderInline(line, key)}
        </p>
      )
      i++
    }
  }

  return <div>{elements}</div>
}

function ReferralCard() {
  const { stats, error: loadError, getReferralLink } = useReferral()
  const referralLink = getReferralLink()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadError) return null

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Refer a friend</CardTitle>
        <p className="text-sm text-slate-500">
          Share your link and earn rewards when friends sign up.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {referralLink ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-600">
                {referralLink}
              </span>
              <Button variant="outline" size="sm" className="shrink-0" onClick={handleCopy}>
                {copied ? (
                  <><Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />Copied!</>
                ) : (
                  <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</>
                )}
              </Button>
            </div>

            {stats && (
              <div className="flex gap-6">
                {([
                  { label: "Clicks", value: stats.clicks },
                  { label: "Signups", value: stats.signups },
                  { label: "Rewards", value: stats.rewards_earned },
                ] as const).map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <span className="text-xl font-bold text-slate-900">{value}</span>
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {stats?.premium_until && (
              <p className="text-xs text-slate-500">
                Premium until{" "}
                {new Date(stats.premium_until).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            )}
          </>
        ) : (
          <div className="h-10 rounded-lg bg-slate-100" />
        )}
      </CardContent>
    </Card>
  )
}
