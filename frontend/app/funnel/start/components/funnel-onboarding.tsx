'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trackFunnelEvent } from '@/lib/analytics'
import { type FunnelProfile, createFunnelSession } from '@/lib/funnel-session'

type Step1Fields = Pick<FunnelProfile, 'name' | 'age' | 'gender' | 'height_cm' | 'weight_kg'>
type Step2Fields = Pick<FunnelProfile, 'goal_weight_kg' | 'timeline_weeks' | 'health_conditions'>
type Step3Fields = Pick<FunnelProfile, 'activity_level' | 'diet_pattern'>

const EMPTY: FunnelProfile = {
  name: '',
  age: 0,
  gender: 'male',
  height_cm: 0,
  weight_kg: 0,
  goal_weight_kg: 0,
  timeline_weeks: 12,
  health_conditions: '',
  activity_level: 'moderate',
  diet_pattern: '',
}

export function FunnelOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<FunnelProfile>(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(fields: Partial<FunnelProfile>) {
    setProfile((p) => ({ ...p, ...fields }))
  }

  function handleStepComplete(nextStep: number) {
    trackFunnelEvent('onboarding_step_completed', { step })
    setStep(nextStep)
    if (nextStep > 1) {
      trackFunnelEvent('onboarding_started')
    }
  }

  async function handleFinish() {
    setLoading(true)
    setError('')
    try {
      await createFunnelSession(profile)
      trackFunnelEvent('onboarding_step_completed', { step: 3 })
      router.push('/funnel/preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1 rounded-full transition-colors ${
              n <= step ? 'bg-white' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Step1
          values={profile}
          onChange={update}
          onNext={() => handleStepComplete(2)}
        />
      )}
      {step === 2 && (
        <Step2
          values={profile}
          onChange={update}
          onBack={() => setStep(1)}
          onNext={() => handleStepComplete(3)}
        />
      )}
      {step === 3 && (
        <Step3
          values={profile}
          onChange={update}
          onBack={() => setStep(2)}
          onFinish={handleFinish}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}

function Step1({
  values,
  onChange,
  onNext,
}: {
  values: Step1Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">About you</h2>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-zinc-300">Name</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="Alex"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age" className="text-zinc-300">Age</Label>
          <Input
            id="age"
            type="number"
            required
            min={16}
            max={100}
            value={values.age || ''}
            onChange={(e) => onChange({ age: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Gender</Label>
          <Select value={values.gender} onValueChange={(v) => onChange({ gender: v })}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height" className="text-zinc-300">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            required
            min={100}
            max={250}
            value={values.height_cm || ''}
            onChange={(e) => onChange({ height_cm: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="175"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-zinc-300">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            required
            min={30}
            max={300}
            value={values.weight_kg || ''}
            onChange={(e) => onChange({ weight_kg: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="90"
          />
        </div>
      </div>
      <Button type="submit" className="w-full">Next →</Button>
    </form>
  )
}

function Step2({
  values,
  onChange,
  onBack,
  onNext,
}: {
  values: Step2Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onBack: () => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Your goal</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goal_weight" className="text-zinc-300">Goal weight (kg)</Label>
          <Input
            id="goal_weight"
            type="number"
            required
            min={30}
            max={300}
            value={values.goal_weight_kg || ''}
            onChange={(e) => onChange({ goal_weight_kg: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="75"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline" className="text-zinc-300">Timeline (weeks)</Label>
          <Input
            id="timeline"
            type="number"
            required
            min={4}
            max={104}
            value={values.timeline_weeks || ''}
            onChange={(e) => onChange({ timeline_weeks: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="16"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="conditions" className="text-zinc-300">
          Health conditions <span className="text-zinc-500">(optional)</span>
        </Label>
        <Input
          id="conditions"
          value={values.health_conditions}
          onChange={(e) => onChange({ health_conditions: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="e.g. diabetes, hypothyroidism"
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1">Next →</Button>
      </div>
    </form>
  )
}

function Step3({
  values,
  onChange,
  onBack,
  onFinish,
  loading,
  error,
}: {
  values: Step3Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onBack: () => void
  onFinish: () => void
  loading: boolean
  error: string
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFinish()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Your lifestyle</h2>
      <div className="space-y-2">
        <Label className="text-zinc-300">Activity level</Label>
        <Select
          value={values.activity_level}
          onValueChange={(v) => onChange({ activity_level: v })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
            <SelectItem value="light">Light (1–2 days/week)</SelectItem>
            <SelectItem value="moderate">Moderate (3–4 days/week)</SelectItem>
            <SelectItem value="high">High (5–6 days/week)</SelectItem>
            <SelectItem value="very_high">Very high (athlete / daily)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="diet" className="text-zinc-300">Diet pattern</Label>
        <Input
          id="diet"
          required
          value={values.diet_pattern}
          onChange={(e) => onChange({ diet_pattern: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="e.g. balanced, vegetarian, low-carb"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Calculating…' : 'See my plan →'}
        </Button>
      </div>
    </form>
  )
}
