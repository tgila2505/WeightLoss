'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { PageShell } from '../components/page-shell';
import { getGroqKey, getMistralKey, setAiKeys, clearAiKeys } from '../../lib/ai-keys';
import { fetchProfile, patchProfileGender } from '../../lib/api-client';

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile — gender
  const [gender, setGender] = useState<string>('');
  const [genderSaving, setGenderSaving] = useState(false);
  const [genderSaved, setGenderSaved] = useState(false);
  const [genderError, setGenderError] = useState('');

  useEffect(() => {
    setGroqKey(getGroqKey() ?? '');
    setMistralKey(getMistralKey() ?? '');
    fetchProfile().then((p) => { if (p?.gender) setGender(p.gender); });
  }, []);

  async function handleGenderChange(value: string) {
    setGender(value);
    setGenderSaving(true);
    setGenderError('');
    try {
      await patchProfileGender(value);
      setGenderSaved(true);
      setTimeout(() => setGenderSaved(false), 2500);
    } catch {
      setGenderError('Failed to save. Please try again.');
    } finally {
      setGenderSaving(false);
    }
  }

  function handleSave() {
    if (groqKey.trim() && mistralKey.trim()) {
      setAiKeys(groqKey.trim(), mistralKey.trim());
    } else {
      clearAiKeys();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    clearAiKeys();
    setGroqKey('');
    setMistralKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const bothSet = Boolean(groqKey.trim() && mistralKey.trim());

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Settings
        </p>
        <h1 className="text-2xl font-bold text-slate-900">AI provider setup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure Groq (primary) and Mistral (fallback) to enable personalised AI responses.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gender-select">Biological sex</Label>
              <p className="text-xs text-slate-500">
                Used to apply sex-specific reference ranges on your lab requisition.
              </p>
              <div className="flex items-center gap-3">
                <Select value={gender} onValueChange={handleGenderChange} disabled={genderSaving}>
                  <SelectTrigger id="gender-select" className="w-48">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {genderSaving && <span className="text-xs text-slate-400">Saving…</span>}
                {genderSaved && !genderSaving && <span className="text-xs font-semibold text-emerald-600">Saved.</span>}
              </div>
              {genderError && <p className="text-xs text-red-500">{genderError}</p>}
            </div>
          </CardContent>
        </Card>

        {/* API keys */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">API keys</CardTitle>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  bothSet
                    ? 'bg-emerald-100 text-emerald-700 border-0'
                    : 'bg-amber-100 text-amber-700 border-0'
                }`}
              >
                {bothSet ? 'AI active' : 'Using built-in rules'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Groq */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Groq</p>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                  Primary
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Get a free key at <strong>console.groq.com</strong> → API Keys → Create API Key
              </p>
              <div className="space-y-2">
                <Label htmlFor="groq-key" className="sr-only">Groq API key</Label>
                <div className="relative">
                  <Input
                    id="groq-key"
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showGroqKey ? 'Hide Groq key' : 'Show Groq key'}
                  >
                    {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Mistral */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Mistral</p>
                <Badge variant="secondary" className="text-xs">
                  Fallback
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Get a free key at <strong>console.mistral.ai</strong> → API Keys → Create new key
              </p>
              <div className="space-y-2">
                <Label htmlFor="mistral-key" className="sr-only">Mistral API key</Label>
                <div className="relative">
                  <Input
                    id="mistral-key"
                    type={showMistralKey ? 'text' : 'password'}
                    value={mistralKey}
                    onChange={(e) => setMistralKey(e.target.value)}
                    placeholder="Mistral API key…"
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMistralKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showMistralKey ? 'Hide Mistral key' : 'Show Mistral key'}
                  >
                    {showMistralKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {saved ? (
              <p className="text-sm font-semibold text-emerald-600">Saved.</p>
            ) : null}

            <Separator />

            <div className="flex items-center gap-3">
              <Button onClick={handleSave}>Save keys</Button>
              {bothSet ? (
                <Button variant="outline" onClick={handleClear}>
                  Remove keys
                </Button>
              ) : null}
            </div>

            <p className="text-xs text-slate-400">
              Keys are stored only in your browser (localStorage) and never sent to our servers.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
