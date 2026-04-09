'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageShell } from '../components/page-shell';
import { getAccessToken } from '../../lib/auth';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AiKeysStatus {
  groq_key_set: boolean;
  groq_key_preview: string;
  mistral_key_set: boolean;
  mistral_key_preview: string;
  updated_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchAiKeys(token: string): Promise<AiKeysStatus> {
  const res = await fetch(`${apiBase}/api/v1/admin/ai-keys`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 403) throw new Error('forbidden');
  if (!res.ok) throw new Error('fetch-failed');
  return res.json() as Promise<AiKeysStatus>;
}

async function saveAiKeys(token: string, groq: string, mistral: string): Promise<AiKeysStatus> {
  const res = await fetch(`${apiBase}/api/v1/admin/ai-keys`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groq_api_key: groq, mistral_api_key: mistral }),
  });
  if (!res.ok) throw new Error('save-failed');
  return res.json() as Promise<AiKeysStatus>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<AiKeysStatus | null>(null);

  const [groqInput, setGroqInput] = useState('');
  const [mistralInput, setMistralInput] = useState('');
  const [showGroq, setShowGroq] = useState(false);
  const [showMistral, setShowMistral] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  const load = useCallback(async () => {
    if (!token) { router.push('/'); return; }
    setLoading(true);
    try {
      const data = await fetchAiKeys(token);
      setStatus(data);
    } catch (err) {
      if (err instanceof Error && err.message === 'forbidden') {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const updated = await saveAiKeys(token, groqInput.trim(), mistralInput.trim());
      setStatus(updated);
      setGroqInput('');
      setMistralInput('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      setSaveError('Failed to save. Check that the backend is running and try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24 text-sm text-slate-400">
          Loading…
        </div>
      </PageShell>
    );
  }

  if (forbidden) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto mt-16 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-lg font-semibold text-slate-700">Access denied</p>
          <p className="text-sm text-slate-500">
            This page is restricted to administrators.
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  const lastUpdated = status?.updated_at
    ? new Date(status.updated_at).toLocaleString()
    : null;

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
            Admin console
          </p>
          <Badge className="text-[10px] bg-violet-100 text-violet-700 border-0 px-1.5 py-0">
            Protected
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage AI provider keys and app-wide settings. Changes take effect immediately — no code changes or server restart required.
        </p>
      </div>

      <div className="max-w-xl space-y-6">

        {/* ── AI Provider Keys ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">AI provider keys</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Keys are stored in the database and synced to service env files.
                </CardDescription>
              </div>
              <button
                onClick={load}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Refresh status"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Current status */}
            <div className="grid grid-cols-2 gap-3">
              <StatusPill label="Groq" isSet={status?.groq_key_set ?? false} preview={status?.groq_key_preview ?? ''} />
              <StatusPill label="Mistral" isSet={status?.mistral_key_set ?? false} preview={status?.mistral_key_preview ?? ''} />
            </div>

            {lastUpdated ? (
              <p className="text-xs text-slate-400">Last updated: {lastUpdated}</p>
            ) : null}

            <Separator />

            {/* Update form */}
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Update keys
            </p>
            <p className="text-xs text-slate-500 -mt-3">
              Leave a field blank to keep the existing value. Enter a new key to replace it.
            </p>

            {/* Groq */}
            <div className="space-y-1.5">
              <Label htmlFor="groq-input" className="text-sm">
                Groq API key
                <span className="ml-2 text-xs text-slate-400 font-normal">primary provider</span>
              </Label>
              <div className="relative">
                <Input
                  id="groq-input"
                  type={showGroq ? 'text' : 'password'}
                  value={groqInput}
                  onChange={(e) => setGroqInput(e.target.value)}
                  placeholder={status?.groq_key_set ? status.groq_key_preview + '  (keep existing)' : 'gsk_…'}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowGroq((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showGroq ? 'Hide' : 'Show'}
                >
                  {showGroq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Mistral */}
            <div className="space-y-1.5">
              <Label htmlFor="mistral-input" className="text-sm">
                Mistral API key
                <span className="ml-2 text-xs text-slate-400 font-normal">fallback provider</span>
              </Label>
              <div className="relative">
                <Input
                  id="mistral-input"
                  type={showMistral ? 'text' : 'password'}
                  value={mistralInput}
                  onChange={(e) => setMistralInput(e.target.value)}
                  placeholder={status?.mistral_key_set ? status.mistral_key_preview + '  (keep existing)' : 'Mistral API key…'}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowMistral((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showMistral ? 'Hide' : 'Show'}
                >
                  {showMistral ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Feedback */}
            {saveSuccess ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Keys saved — ai-services reloaded, env files updated.
              </div>
            ) : null}
            {saveError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                {saveError}
              </div>
            ) : null}

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving || (!groqInput && !mistralInput)}>
                {saving ? 'Saving…' : 'Save keys'}
              </Button>
              <p className="text-xs text-slate-400">
                Keys are never exposed to end users.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── System info ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <InfoRow label="Backend" value={apiBase} />
            <InfoRow label="AI services" value={apiBase.replace(':8000', ':8001')} />
            <InfoRow label="Admin access" value="This account" />
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusPill({ label, isSet, preview }: { label: string; isSet: boolean; preview: string }) {
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${isSet ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <Badge
          className={`text-[10px] px-1.5 py-0 border-0 ${isSet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
        >
          {isSet ? 'Active' : 'Not set'}
        </Badge>
      </div>
      {isSet && preview ? (
        <p className="text-[11px] font-mono text-slate-500 truncate">{preview}</p>
      ) : (
        <p className="text-[11px] text-amber-600">No key configured</p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}
