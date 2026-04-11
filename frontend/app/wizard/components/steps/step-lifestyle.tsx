'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { StepProps } from '../../types/wizard'

const LIKERT = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

export function StepLifestyle({ answers, onAnswersChange, errors }: StepProps) {

  // ─── Node answer helpers ──────────────────────────────────────────────

  function getNode(nodeId: string): Record<string, unknown> {
    return (answers[nodeId] as Record<string, unknown>) ?? {}
  }

  function setNodeKey(nodeId: string, key: string, value: unknown) {
    onAnswersChange({ ...answers, [nodeId]: { ...getNode(nodeId), [key]: value } })
  }

  function getStr(nodeId: string, key: string): string {
    return String(getNode(nodeId)[key] ?? '')
  }

  function getBool(nodeId: string, key: string): boolean | undefined {
    const v = getNode(nodeId)[key]
    return v === undefined ? undefined : Boolean(v)
  }

  function getList(nodeId: string, key: string): string[] {
    return (getNode(nodeId)[key] as string[]) ?? []
  }

  function toggle(nodeId: string, key: string, item: string) {
    const list = getList(nodeId, key)
    setNodeKey(nodeId, key, list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  function fieldError(field: string) {
    return errors.find(e => e.field === field)?.message
  }

  // ─── Section completion helper ────────────────────────────────────────

  function nodeHasData(nodeId: string): boolean {
    const node = getNode(nodeId)
    return Object.values(node).some(v => {
      if (Array.isArray(v)) return v.length > 0
      if (typeof v === 'boolean') return true
      if (typeof v === 'string') return v !== ''
      return v != null
    })
  }

  function done(...nodeIds: string[]): boolean {
    return nodeIds.some(nodeHasData)
  }

  // ─── Reusable UI primitives ───────────────────────────────────────────

  function RadioOpts({ nodeId, qId, opts }: { nodeId: string; qId: string; opts: string[] }) {
    const val = getStr(nodeId, qId)
    return (
      <div className="flex flex-col gap-1.5">
        {opts.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => setNodeKey(nodeId, qId, opt)}
            className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${
              val === opt
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  function CheckOpts({ nodeId, qId, opts }: { nodeId: string; qId: string; opts: string[] }) {
    const selected = getList(nodeId, qId)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        {opts.map(opt => (
          <div key={opt} className="flex items-center gap-2">
            <Checkbox
              id={`${nodeId}-${qId}-${opt}`}
              checked={selected.includes(opt)}
              onCheckedChange={() => toggle(nodeId, qId, opt)}
            />
            <Label
              htmlFor={`${nodeId}-${qId}-${opt}`}
              className="text-sm font-normal cursor-pointer leading-tight"
            >
              {opt}
            </Label>
          </div>
        ))}
      </div>
    )
  }

  function YesNo({ nodeId, qId, label }: { nodeId: string; qId: string; label: string }) {
    const val = getBool(nodeId, qId)
    return (
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex gap-2">
          {[true, false].map(bool => (
            <button
              key={String(bool)}
              type="button"
              onClick={() => setNodeKey(nodeId, qId, bool)}
              className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                val === bool
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {bool ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function LikertRow({ nodeId, qId, label }: { nodeId: string; qId: string; label: string }) {
    const val = getStr(nodeId, qId)
    return (
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex flex-wrap gap-1">
          {LIKERT.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setNodeKey(nodeId, qId, opt)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                val === opt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function Badge() {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground text-xs font-medium px-1.5 h-5">
        ✓
      </span>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Sleep hours — flat profile field, required */}
      <div className="space-y-2">
        <Label htmlFor="sleep_hours">
          Average sleep per night (hours) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sleep_hours"
          type="number"
          min={1}
          max={24}
          step={0.5}
          value={String(answers.sleep_hours ?? '')}
          onChange={e => onAnswersChange({ ...answers, sleep_hours: Number(e.target.value) })}
          placeholder="e.g. 7"
        />
        {fieldError('sleep_hours') && (
          <p className="text-xs text-destructive">{fieldError('sleep_hours')}</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        The sections below are optional but help personalise your plan significantly.
        Fill in as much or as little as you like.
      </p>

      <Accordion type="multiple" className="border rounded-lg divide-y overflow-hidden">

        {/* ── Exercise ─────────────────────────────────────────────────── */}
        <AccordionItem value="exercise" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Exercise
              {done('exercise-types', 'exercise-habits') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Types of exercise you currently do</p>
              <CheckOpts
                nodeId="exercise-types"
                qId="types"
                opts={[
                  'Walking', 'Running/jogging', 'Cycling', 'Swimming', 'Weight training',
                  'HIIT', 'Yoga', 'Pilates', 'Team sports', 'Martial arts', 'Dancing',
                  'Rowing', 'Elliptical', 'None currently',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How often do you exercise?</p>
              <RadioOpts
                nodeId="exercise-habits"
                qId="frequency"
                opts={['Daily', '4-6x/week', '2-3x/week', 'Once a week', 'A few times a month', 'Rarely/never']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Typical session duration</p>
              <RadioOpts
                nodeId="exercise-habits"
                qId="duration"
                opts={['< 20 min', '20-30 min', '30-45 min', '45-60 min', '> 60 min']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Typical intensity</p>
              <RadioOpts
                nodeId="exercise-habits"
                qId="intensity"
                opts={[
                  'Low (light activity, no sweat)',
                  'Moderate (elevated HR, some sweat)',
                  'High (hard breathing, heavy sweat)',
                  'Varies widely',
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Sleep ────────────────────────────────────────────────────── */}
        <AccordionItem value="sleep" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Sleep
              {done('sleep-routine', 'sleep-habits', 'sleep-symptoms-current-state') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Total sleep per night (approximate)</p>
              <RadioOpts
                nodeId="sleep-routine"
                qId="total-sleep"
                opts={['< 5 hours', '5-6 hours', '6-7 hours', '7-8 hours', '> 8 hours']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Time to fall asleep</p>
              <RadioOpts
                nodeId="sleep-routine"
                qId="sleep-onset"
                opts={['< 10 min', '10-20 min', '20-30 min', '> 30 min']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Overall sleep quality</p>
              <RadioOpts
                nodeId="sleep-symptoms-current-state"
                qId="overall-quality"
                opts={['Excellent', 'Good', 'Fair', 'Poor', 'Very poor']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sleep symptoms (select all that apply)</p>
              <CheckOpts
                nodeId="sleep-symptoms-current-state"
                qId="symptoms"
                opts={[
                  'Difficulty falling asleep', 'Waking during the night', 'Waking too early',
                  'Non-restorative sleep', 'Daytime sleepiness', 'Snoring',
                  'Witnessed apneas (gasping)', 'Restless legs', 'Nightmares',
                  'Sleepwalking', 'None of the above',
                ]}
              />
            </div>
            <YesNo nodeId="sleep-habits" qId="screens-before-bed" label="Do you use screens (phone/TV) within 1 hour of bed?" />
            <YesNo nodeId="sleep-habits" qId="afternoon-caffeine" label="Do you consume caffeine after 2 PM?" />
          </AccordionContent>
        </AccordionItem>

        {/* ── Stress & Mental Health ────────────────────────────────────── */}
        <AccordionItem value="stress" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Stress & Mental Health
              {done('stress-tolerance-routine', 'stress-tolerance-habits', 'stress-symptoms-current-state', 'mental-health-current-state') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Stress management practices (select all that apply)</p>
              <CheckOpts
                nodeId="stress-tolerance-routine"
                qId="practices"
                opts={[
                  'Meditation/mindfulness', 'Deep breathing exercises', 'Journaling',
                  'Prayer/spiritual practice', 'Time in nature', 'Creative outlets (art, music)',
                  'Physical exercise', 'Social connection', 'Professional therapy/counseling',
                  'No regular stress management practice',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Work-life balance</p>
              <RadioOpts
                nodeId="stress-tolerance-habits"
                qId="work-life-balance"
                opts={['Well balanced', 'Somewhat balanced', 'Mostly work/responsibilities', 'Severely imbalanced']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How often do you feel overwhelmed or burned out?</p>
              <RadioOpts
                nodeId="stress-tolerance-habits"
                qId="overwhelm-frequency"
                opts={['Rarely', 'Sometimes (a few times/month)', 'Often (weekly)', 'Almost constantly']}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Stress symptoms (select all that apply)</p>
              <CheckOpts
                nodeId="stress-symptoms-current-state"
                qId="symptoms"
                opts={[
                  'Irritability or mood swings', 'Anxiety or worry', 'Low mood/depression',
                  'Brain fog / difficulty concentrating', 'Forgetfulness',
                  'Muscle tension or headaches', 'Jaw clenching/teeth grinding',
                  'Digestive upset', 'Fatigue despite adequate sleep',
                  'Increased appetite or cravings', 'Decreased appetite',
                  'Social withdrawal', 'None of the above',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Current mood most days</p>
              <RadioOpts
                nodeId="mental-health-current-state"
                qId="current-mood"
                opts={[
                  'Generally positive and stable',
                  'Mostly okay with occasional low days',
                  'Frequently low, anxious, or irritable',
                  'Persistently struggling',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Mental health symptoms (select all that apply)</p>
              <CheckOpts
                nodeId="mental-health-current-state"
                qId="symptoms"
                opts={[
                  'Difficulty concentrating', 'Low motivation', 'Social withdrawal',
                  'Irritability or anger', 'Emotional numbness', 'Panic attacks',
                  'Intrusive thoughts', 'None of the above',
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Substance Use ─────────────────────────────────────────────── */}
        <AccordionItem value="substances" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Substance Use
              {done('harmful-substance-habits') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <YesNo nodeId="harmful-substance-habits" qId="smokes" label="Do you currently smoke tobacco?" />
            <YesNo nodeId="harmful-substance-habits" qId="drinks-alcohol" label="Do you drink alcohol?" />
            {getBool('harmful-substance-habits', 'drinks-alcohol') === true && (
              <div className="space-y-2">
                <p className="text-sm font-medium">How much do you drink?</p>
                <RadioOpts
                  nodeId="harmful-substance-habits"
                  qId="alcohol-frequency"
                  opts={[
                    'Occasionally (< 1x/week)', '1-3 drinks/week', '4-7 drinks/week',
                    '1-2 drinks/day', '> 2 drinks/day',
                  ]}
                />
              </div>
            )}
            <YesNo nodeId="harmful-substance-habits" qId="recreational-drugs" label="Do you use recreational drugs or cannabis?" />
          </AccordionContent>
        </AccordionItem>

        {/* ── Gut Health & Metabolism ───────────────────────────────────── */}
        <AccordionItem value="gut-metabolism" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Gut Health & Metabolism
              {done('gut-health-current-state', 'metabolic-flexibility-assessment', 'aerobics-capacity-current-state', 'inflammation-current-state') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">GI symptoms (select all that apply)</p>
              <CheckOpts
                nodeId="gut-health-current-state"
                qId="symptoms"
                opts={[
                  'Bloating', 'Gas/flatulence', 'Abdominal pain or cramping',
                  'Constipation (< 3 BMs/week)', 'Diarrhea (loose stools > 3x/day)',
                  'Alternating constipation and diarrhea', 'Heartburn/acid reflux',
                  'Nausea', 'Food sensitivities/intolerances', 'None of the above',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How do you feel between meals (if you go 4-5 hours without eating)?</p>
              <RadioOpts
                nodeId="metabolic-flexibility-assessment"
                qId="between-meals"
                opts={[
                  'Fine — no hunger or energy dips',
                  'Mild hunger but manageable',
                  'Significant hunger and energy dip',
                  'Irritable, shaky, or unable to focus',
                ]}
              />
            </div>
            <YesNo nodeId="metabolic-flexibility-assessment" qId="post-meal-crash" label="Do you experience energy crashes after meals?" />
            <YesNo nodeId="metabolic-flexibility-assessment" qId="carb-cravings" label="Do you have strong cravings for carbohydrates or sugar?" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Inflammation symptoms (select all that apply)</p>
              <CheckOpts
                nodeId="inflammation-current-state"
                qId="symptoms"
                opts={[
                  'Chronic joint pain or stiffness', 'Persistent fatigue',
                  'Recurrent skin issues (eczema, psoriasis, acne)',
                  'Frequent infections or slow recovery',
                  'Allergies (seasonal or food)', 'Autoimmune diagnosis', 'Brain fog',
                  'Unexplained weight gain', 'Puffiness or water retention', 'None of the above',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Current cardiovascular fitness</p>
              <RadioOpts
                nodeId="aerobics-capacity-current-state"
                qId="fitness-level"
                opts={[
                  'Excellent — can sustain vigorous activity for 30+ min',
                  'Good — comfortable with moderate activity',
                  'Fair — get winded with moderate exertion',
                  'Poor — short walks cause significant breathlessness',
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Social & Mindset ──────────────────────────────────────────── */}
        <AccordionItem value="social-mindset" className="border-0">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40 text-sm [&>svg]:ml-auto">
            <span className="flex items-center gap-2">
              Social & Mindset
              {done('social-history-current-state', 'relationships-quality', 'change-readiness-readiness', 'purpose-assessment') && <Badge />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current living situation</p>
              <RadioOpts
                nodeId="social-history-current-state"
                qId="living-situation"
                opts={[
                  'Living alone', 'With partner/spouse', 'With family (children/parents)',
                  'With roommates', 'Other',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Daily environment stressors (select all that apply)</p>
              <CheckOpts
                nodeId="social-history-current-state"
                qId="stressors"
                opts={[
                  'High-stress work', 'Long commute (> 45 min each way)',
                  'Shift work or irregular hours', 'Caregiver responsibilities',
                  'Financial stress', 'Housing instability', 'Food insecurity', 'None of the above',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How would you rate your closest personal relationships?</p>
              <RadioOpts
                nodeId="relationships-quality"
                qId="relationship-rating"
                opts={[
                  'Excellent — very supportive',
                  'Good — mostly positive',
                  'Fair — some tension/challenges',
                  'Poor — significant difficulties',
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sense of purpose in life</p>
              <RadioOpts
                nodeId="purpose-assessment"
                qId="sense-of-purpose"
                opts={[
                  'Strong — I feel my life has clear meaning',
                  'Moderate — I have some sense of purpose',
                  'Weak — I often feel directionless',
                  'Absent — I struggle to find meaning',
                ]}
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Readiness to change</p>
              <LikertRow nodeId="change-readiness-readiness" qId="motivated" label="I am motivated to make significant changes to my lifestyle." />
              <LikertRow nodeId="change-readiness-readiness" qId="capable" label="I believe I am capable of making and sustaining these changes." />
              <LikertRow nodeId="change-readiness-readiness" qId="clear-why" label="I have a clear understanding of why I want to improve my health." />
              <LikertRow nodeId="change-readiness-readiness" qId="time-resources" label="I have the time and resources available to commit to a health programme." />
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  )
}
