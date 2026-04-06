'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CheckCircle2, Clock, Plus, X } from 'lucide-react'
import type { StepProps } from '../../types/wizard'

// ─── Types ────────────────────────────────────────────────────────────────

type HealthGate = 'yes' | 'none' | 'deferred'

interface Medication {
  name: string
  dose: string
}

// ─── Condition groups ─────────────────────────────────────────────────────

const CONDITION_GROUPS = [
  {
    nodeId: 'past-medical-history-cardiovascular',
    label: 'Cardiovascular',
    options: [
      'Hypertension', 'High cholesterol', 'Coronary artery disease', 'Heart attack',
      'Heart failure', 'Atrial fibrillation', 'Stroke/TIA', 'Other cardiovascular',
    ],
  },
  {
    nodeId: 'past-medical-history-endocrine',
    label: 'Endocrine / Metabolic',
    options: [
      'Type 2 Diabetes', 'Type 1 Diabetes', 'Pre-diabetes', 'Hypothyroidism',
      'Hyperthyroidism', 'PCOS', 'Metabolic syndrome', 'Other endocrine',
    ],
  },
  {
    nodeId: 'past-medical-history-musculoskeletal',
    label: 'Musculoskeletal',
    options: [
      'Back pain', 'Knee pain', 'Osteoarthritis', 'Rheumatoid arthritis',
      'Osteoporosis', 'Fibromyalgia', 'Other musculoskeletal',
    ],
  },
  {
    nodeId: 'past-medical-history-respiratory',
    label: 'Respiratory',
    options: ['Asthma', 'COPD/Emphysema', 'Sleep apnea', 'Other respiratory'],
  },
  {
    nodeId: 'past-medical-history-neurologic',
    label: 'Neurologic',
    options: ['Migraines', 'Neuropathy', 'Multiple sclerosis', 'Other neurologic'],
  },
  {
    nodeId: 'past-medical-history-psychiatric',
    label: 'Mental Health',
    options: [
      'Depression', 'Anxiety disorder', 'Bipolar disorder', 'ADHD',
      'Eating disorder', 'Other psychiatric',
    ],
  },
  {
    nodeId: 'past-medical-history-gastroenterological',
    label: 'Gastrointestinal',
    options: [
      'GERD/acid reflux', 'Irritable bowel syndrome', 'Inflammatory bowel disease',
      'Celiac disease', 'Non-alcoholic fatty liver', 'Other GI',
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────

export function StepMedicalHistory({ answers, onAnswersChange }: StepProps) {
  const gate = answers.__gate as HealthGate | undefined
  const hasMeds = answers.__has_medications as boolean | undefined
  const medications = (answers.__medications as Medication[]) ?? []

  // ── Condition helpers ──────────────────────────────────────────────────

  function getNodeConditions(nodeId: string): string[] {
    const node = answers[nodeId] as Record<string, unknown> | undefined
    return (node?.conditions as string[]) ?? []
  }

  function toggleCondition(nodeId: string, condition: string) {
    const current = getNodeConditions(nodeId)
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition]
    const nodeAnswers = { ...(answers[nodeId] as Record<string, unknown> ?? {}), conditions: updated }
    const allConditions = CONDITION_GROUPS.flatMap((g) =>
      g.nodeId === nodeId ? updated : getNodeConditions(g.nodeId)
    )
    onAnswersChange({ ...answers, [nodeId]: nodeAnswers, summary: allConditions.join(', ') })
  }

  // ── Gate ───────────────────────────────────────────────────────────────

  function setGate(value: HealthGate) {
    if (value === 'none') {
      const cleared = Object.fromEntries(
        CONDITION_GROUPS.map((g) => [g.nodeId, { conditions: [] }])
      )
      onAnswersChange({ ...answers, ...cleared, summary: '', __gate: value })
    } else {
      onAnswersChange({ ...answers, __gate: value })
    }
  }

  // ── Medication helpers ─────────────────────────────────────────────────

  function serializeMeds(meds: Medication[]): string {
    return meds
      .map((m) => [m.name, m.dose].filter(Boolean).join(' '))
      .filter(Boolean)
      .join('; ')
  }

  function syncMedications(meds: Medication[]) {
    onAnswersChange({
      ...answers,
      __medications: meds,
      'regular-medication-each-medicine': { medications: serializeMeds(meds) },
    })
  }

  function setHasMeds(value: boolean) {
    if (!value) {
      onAnswersChange({
        ...answers,
        __has_medications: false,
        __medications: [],
        'regular-medication-each-medicine': { medications: '' },
      })
    } else {
      const initial = medications.length === 0 ? [{ name: '', dose: '' }] : medications
      onAnswersChange({ ...answers, __has_medications: true, __medications: initial })
    }
  }

  function addMedication() {
    syncMedications([...medications, { name: '', dose: '' }])
  }

  function updateMedication(index: number, field: keyof Medication, value: string) {
    syncMedications(medications.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  function removeMedication(index: number) {
    const updated = medications.filter((_, i) => i !== index)
    if (updated.length === 0) {
      onAnswersChange({
        ...answers,
        __has_medications: false,
        __medications: [],
        'regular-medication-each-medicine': { medications: '' },
      })
    } else {
      syncMedications(updated)
    }
  }

  const totalSelected = CONDITION_GROUPS.reduce(
    (sum, g) => sum + getNodeConditions(g.nodeId).length,
    0
  )

  return (
    <div className="space-y-8">

      {/* ── 3A: Conditions ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This helps personalise your plan. Everything here is private and optional.
        </p>

        {/* Gate buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GateButton active={gate === 'yes'} onClick={() => setGate('yes')} label="Yes, I have some" />
          <GateButton active={gate === 'none'} onClick={() => setGate('none')} label="No, none I know of" />
          <GateButton active={gate === 'deferred'} onClick={() => setGate('deferred')} label="I'll fill this in later" />
        </div>

        {/* Accordion — only when gate is 'yes' */}
        {gate === 'yes' && (
          <div className="space-y-1">
            {totalSelected > 0 && (
              <p className="text-xs text-muted-foreground pb-1">
                {totalSelected} condition{totalSelected !== 1 ? 's' : ''} selected
              </p>
            )}
            <Accordion type="multiple" className="border rounded-lg divide-y overflow-hidden">
              {CONDITION_GROUPS.map((group) => {
                const selected = getNodeConditions(group.nodeId)
                return (
                  <AccordionItem
                    key={group.nodeId}
                    value={group.nodeId}
                    className="border-0"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
                      <span className="flex items-center gap-2">
                        {group.label}
                        {selected.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground text-xs font-medium px-1.5 h-5">
                            {selected.length}
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 pt-1">
                        {group.options.map((option) => (
                          <div key={option} className="flex items-center gap-2">
                            <Checkbox
                              id={`${group.nodeId}-${option}`}
                              checked={selected.includes(option)}
                              onCheckedChange={() => toggleCondition(group.nodeId, option)}
                            />
                            <Label
                              htmlFor={`${group.nodeId}-${option}`}
                              className="text-sm font-normal cursor-pointer leading-tight"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        )}

        {/* None confirmation */}
        {gate === 'none' && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            No conditions recorded.
          </div>
        )}

        {/* Deferred notice */}
        {gate === 'deferred' && (
          <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            You can complete your health history from Profile Settings at any time.
          </div>
        )}
      </div>

      {/* ── 3B: Medications (revealed after gate is answered) ───────────── */}
      {gate != null && (
        <div className="space-y-4 pt-2 border-t">
          <div>
            <p className="text-sm font-medium">Current medications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Include supplements if relevant. Optional.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={hasMeds === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHasMeds(false)}
            >
              None
            </Button>
            <Button
              type="button"
              variant={hasMeds === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHasMeds(true)}
            >
              I take medications
            </Button>
          </div>

          {hasMeds === true && (
            <div className="space-y-2">
              {medications.map((med, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Dose / notes"
                    value={med.dose}
                    onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                    className="w-36"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMedication(index)}
                    aria-label="Remove medication"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add medication
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Gate button ──────────────────────────────────────────────────────────

function GateButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-left ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
