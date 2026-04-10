'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../components/page-shell';
import { fetchGamificationStatus, fetchProfile, updateGender } from '../../lib/api-client';
import { BadgeGallery } from '@/components/gamification/badge-gallery';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SettingsPage() {
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [gender, setGender] = useState('');
  const [savingGender, setSavingGender] = useState(false);
  const [genderSaved, setGenderSaved] = useState(false);
  const [genderError, setGenderError] = useState('');

  useEffect(() => {
    fetchGamificationStatus().then(g => setEarnedBadges(g.badges)).catch(() => {});
    fetchProfile().then(p => { if (p?.gender) setGender(p.gender); }).catch(() => {});
  }, []);

  async function handleGenderSave() {
    if (!gender) return;
    setSavingGender(true);
    setGenderError('');
    setGenderSaved(false);
    try {
      await updateGender(gender);
      setGenderSaved(true);
      setTimeout(() => setGenderSaved(false), 3000);
    } catch {
      setGenderError('Failed to save. Please try again.');
    } finally {
      setSavingGender(false);
    }
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Settings
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Account settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and view your achievements.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Biological sex — available to all users, needed for lab requisition */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Biological sex</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Used to calculate reference ranges for lab results.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="gender-select">Sex</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender-select" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenderSave}
              disabled={!gender || savingGender}
              size="sm"
            >
              {savingGender ? 'Saving…' : genderSaved ? 'Saved!' : 'Save'}
            </Button>
          </div>
          {genderError && <p className="text-sm text-red-600">{genderError}</p>}
        </div>

        {/* Phase 13: Badge gallery */}
        <BadgeGallery earnedBadges={earnedBadges} />
      </div>
    </PageShell>
  );
}
