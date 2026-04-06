'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { StepProps } from '../../types/wizard'

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

export function StepMedicalHistory({ answers, onAnswersChange }: StepProps) {
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

    // Update flat summary for profile mapper
    const allConditions = CONDITION_GROUPS.flatMap((g) =>
      g.nodeId === nodeId ? updated : getNodeConditions(g.nodeId)
    )
    onAnswersChange({ ...answers, [nodeId]: nodeAnswers, summary: allConditions.join(', ') })
  }

  const medicationsNode = answers['regular-medication-each-medicine'] as Record<string, unknown> | undefined

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select all conditions that apply. This information helps personalize your health plan.
      </p>

      {CONDITION_GROUPS.map((group) => (
        <div key={group.nodeId} className="space-y-2">
          <h3 className="font-medium text-sm">{group.label}</h3>
          <div className="grid grid-cols-2 gap-2">
            {group.options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${group.nodeId}-${option}`}
                  checked={getNodeConditions(group.nodeId).includes(option)}
                  onCheckedChange={() => toggleCondition(group.nodeId, option)}
                />
                <Label
                  htmlFor={`${group.nodeId}-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="medications">Current medications (optional)</Label>
        <Textarea
          id="medications"
          value={String(medicationsNode?.medications ?? '')}
          onChange={(e) =>
            onAnswersChange({
              ...answers,
              'regular-medication-each-medicine': { medications: e.target.value },
            })
          }
          placeholder="e.g. Metformin 500mg twice daily"
          rows={3}
        />
      </div>
    </div>
  )
}
