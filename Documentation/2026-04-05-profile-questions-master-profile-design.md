# Design: Profile Questions, Questionnaire Persistence & Master User Profile

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Full-stack feature across frontend, backend, and AI services

---

## Overview

Enhance the mind map's 2nd-level child nodes with structured questionnaire questions drawn from the LifestyleRx.io intake PDF. User responses are persisted to a dedicated backend table and used by an AI service to generate a comprehensive narrative "Master User Profile." The profile is displayed on a new sidebar page and can be printed to PDF alongside lab chart trends. The profile also feeds into the meal plan and activity plan AI orchestrator.

---

## Section 1: Architecture

### 1.1 Data Flow

```
Mind Map Modal (frontend)
  → PUT /api/v1/questionnaire/{node_id}  (backend)
    → questionnaire_responses table (Postgres)

User Profile Page (frontend)
  → POST /api/v1/user-profile/generate   (backend)
    → POST /orchestrator/master-profile  (ai-services)
      ← profile_text (narrative string)
    → master_user_profiles table (Postgres)
  → GET /api/v1/user-profile/master      (backend)
    ← profile_text + generated_at

Meal/Activity Plan Request (frontend)
  → POST /orchestrator/meal-plan         (backend → ai-services)
    → includes master_profile + questionnaire_summary in context
```

### 1.2 New Files

| Layer | File | Purpose |
|-------|------|---------|
| Frontend | `app/mindmap/schema/questions.ts` | All question definitions for 38 nodes |
| Frontend | `app/user-profile/page.tsx` | User Profile page |
| Frontend | `lib/api-client.ts` | New questionnaire + profile API functions |
| Backend | `app/models/questionnaire.py` | Two new SQLAlchemy models |
| Backend | `app/routers/questionnaire.py` | 4 new API endpoints |
| Backend | `app/schemas/questionnaire.py` | Pydantic schemas |
| Backend | `alembic/versions/xxx_questionnaire_tables.py` | Migration |
| AI Services | `app/orchestrator/profile_agent.py` | Master profile generation |

### 1.3 Modified Files

| Layer | File | Change |
|-------|------|--------|
| Frontend | `app/mindmap/components/node-modal.tsx` | New question type renderers |
| Frontend | `app/components/nav-bar.tsx` | Add "User Profile" sidebar entry |
| AI Services | `app/orchestrator/orchestrator.py` | Add master_profile to agent context |

---

## Section 2: Question Schema

All 23 PDF sections mapped to 38 second-level node IDs. Question types used:
- `checkbox-group` — multiple selections from a list
- `radio` — single selection
- `yes-no` — binary Yes/No toggle
- `likert-5` — 5-point scale (Strongly Disagree → Strongly Agree)
- `rating-10` — 1–10 numeric rating
- `multi-text` — dynamic list of text inputs
- `text` — free-form text entry

### past-medical-history-musculoskeletal
```
checkbox-group: ["Back pain", "Neck pain", "Shoulder pain", "Hip pain", "Knee pain",
  "Foot/ankle pain", "Osteoarthritis", "Rheumatoid arthritis", "Osteoporosis",
  "Fibromyalgia", "Gout", "Other musculoskeletal"]
```

### past-medical-history-cancer
```
checkbox-group: ["Breast", "Prostate", "Colon/rectal", "Lung", "Skin (melanoma)",
  "Skin (non-melanoma)", "Thyroid", "Lymphoma", "Leukemia", "Ovarian", "Uterine",
  "Bladder", "Kidney", "Other cancer"]
```

### past-medical-history-cardiovascular
```
checkbox-group: ["Hypertension", "High cholesterol", "Coronary artery disease",
  "Heart attack", "Heart failure", "Atrial fibrillation", "Stroke/TIA",
  "Peripheral artery disease", "Deep vein thrombosis", "Pulmonary embolism",
  "Aortic aneurysm", "Valvular heart disease", "Other cardiovascular"]
```

### past-medical-history-respiratory
```
checkbox-group: ["Asthma", "COPD/Emphysema", "Chronic bronchitis", "Sleep apnea",
  "Pulmonary fibrosis", "Pulmonary hypertension", "Recurrent pneumonia",
  "Other respiratory"]
```

### past-medical-history-endocrine
```
checkbox-group: ["Type 1 Diabetes", "Type 2 Diabetes", "Pre-diabetes",
  "Hypothyroidism", "Hyperthyroidism", "Hashimoto's thyroiditis",
  "Graves' disease", "Adrenal insufficiency", "Cushing's syndrome",
  "Polycystic ovary syndrome (PCOS)", "Metabolic syndrome", "Other endocrine"]
```

### past-medical-history-neurologic
```
checkbox-group: ["Migraines", "Tension headaches", "Epilepsy/seizures",
  "Multiple sclerosis", "Parkinson's disease", "Alzheimer's/dementia",
  "Neuropathy", "Tremor", "Vertigo/dizziness", "Concussion history",
  "Other neurologic"]
```

### past-medical-history-psychiatric
```
checkbox-group: ["Depression", "Anxiety disorder", "Panic disorder", "PTSD",
  "Bipolar disorder", "OCD", "Eating disorder", "ADHD", "Autism spectrum",
  "Schizophrenia", "Substance use disorder", "Other psychiatric"]
```

### past-medical-history-infections
```
checkbox-group: ["Hepatitis B", "Hepatitis C", "HIV", "Lyme disease",
  "Recurrent UTIs", "H. pylori", "Epstein-Barr / mono", "COVID-19 (long COVID)",
  "Other chronic/recurrent infection"]
```

### past-medical-history-gynecologic
```
checkbox-group: ["Endometriosis", "Uterine fibroids", "Ovarian cysts",
  "Cervical dysplasia", "Pelvic inflammatory disease", "Infertility",
  "Menopause (natural)", "Surgical menopause", "Premature ovarian insufficiency",
  "Abnormal uterine bleeding", "Other gynecologic"]
```

### past-medical-history-gastroenterological
```
checkbox-group: ["GERD/acid reflux", "Peptic ulcer disease", "Irritable bowel syndrome",
  "Inflammatory bowel disease (Crohn's/UC)", "Celiac disease", "Non-alcoholic fatty liver",
  "Gallstones/gallbladder disease", "Pancreatitis", "Diverticulosis/diverticulitis",
  "Chronic constipation", "Chronic diarrhea", "Other GI"]
```

### past-medical-history-surgical
```
multi-text: list of past surgical procedures (free-text entries)
```

### past-medical-history-other
```
multi-text: list of other medical conditions not covered above
```

### dental-hygiene
```
radio: ["Brush 2x/day + floss daily", "Brush 2x/day, floss sometimes",
        "Brush once/day", "Irregular brushing"]
radio: ["Every 6 months", "Once a year", "Every 2+ years", "Rarely/never"] (dental visits)
```

### dental-history
```
checkbox-group: ["Cavities/fillings", "Gum disease (gingivitis/periodontitis)",
  "Tooth loss", "Root canals", "Crowns or bridges", "Dental implants",
  "Orthodontic treatment", "TMJ disorder", "Teeth grinding (bruxism)",
  "Dry mouth", "Other dental history"]
```

### family-history-relative
```
Multi-section: for each of [Parent, Sibling, Grandparent]:
  checkbox-group: ["Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
    "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
    "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other"]
```

### regular-medication-each-medicine
```
multi-text: list of medications (name, dose, frequency — one per entry)
```

### nutrition-groups
```
radio: ["Omnivore (eat everything)", "Flexitarian (mostly plant-based, some meat)",
        "Pescatarian", "Vegetarian", "Vegan", "Keto/low-carb", "Paleo",
        "Mediterranean", "Other"]
checkbox-group food sensitivities: ["Gluten", "Dairy", "Eggs", "Soy", "Nuts",
  "Shellfish", "Nightshades", "FODMAP foods", "None known"]
```

### nutrition-habits
```
radio meal frequency: ["1-2 meals/day", "3 meals/day", "3 meals + snacks",
                        "Grazing throughout day"]
radio breakfast: ["Always", "Most days", "Sometimes", "Rarely/never"]
radio home cooking: ["Most meals at home", "About half and half",
                      "Mostly eat out / takeout"]
yes-no: "Do you track calories or macros?"
yes-no: "Do you practice intermittent fasting?"
text: "Any other dietary notes or restrictions?"
```

### exercise-types
```
checkbox-group: ["Walking", "Running/jogging", "Cycling", "Swimming", "Weight training",
  "HIIT", "Yoga", "Pilates", "Team sports", "Martial arts", "Dancing",
  "Rowing", "Elliptical", "None currently"]
```

### exercise-habits
```
radio frequency: ["Daily", "4-6x/week", "2-3x/week", "Once a week",
                   "A few times a month", "Rarely/never"]
radio duration: ["< 20 min", "20-30 min", "30-45 min", "45-60 min", "> 60 min"]
radio intensity: ["Low (light activity, no sweat)", "Moderate (elevated HR, some sweat)",
                   "High (hard breathing, heavy sweat)", "Varies widely"]
text: "Any physical limitations or injuries affecting exercise?"
```

### sleep-routine
```
text: "Typical bedtime (e.g. 10:30 PM)"
text: "Typical wake time (e.g. 6:30 AM)"
radio total sleep: ["< 5 hours", "5-6 hours", "6-7 hours", "7-8 hours", "> 8 hours"]
radio: "How long does it typically take to fall asleep?"
  options: ["< 10 min", "10-20 min", "20-30 min", "> 30 min"]
```

### sleep-habits
```
yes-no: "Do you use screens (phone/TV) within 1 hour of bed?"
yes-no: "Do you consume caffeine after 2 PM?"
yes-no: "Do you use alcohol to help sleep?"
radio sleep environment: ["Very dark and quiet", "Some light or noise", "Significant light/noise"]
yes-no: "Do you use a sleep tracking device?"
```

### sleep-symptoms-current-state
```
checkbox-group: ["Difficulty falling asleep", "Waking during the night",
  "Waking too early", "Non-restorative sleep", "Daytime sleepiness",
  "Snoring", "Witnessed apneas (gasping)", "Restless legs", "Nightmares",
  "Sleepwalking", "None of the above"]
radio overall sleep quality: ["Excellent", "Good", "Fair", "Poor", "Very poor"]
```

### stress-tolerance-routine
```
checkbox-group: ["Meditation/mindfulness", "Deep breathing exercises", "Journaling",
  "Prayer/spiritual practice", "Time in nature", "Creative outlets (art, music)",
  "Physical exercise", "Social connection", "Professional therapy/counseling",
  "No regular stress management practice"]
radio: "How many hours of personal/leisure time do you get per day (avg)?"
  options: ["< 30 min", "30-60 min", "1-2 hours", "> 2 hours"]
```

### stress-tolerance-habits
```
radio work-life balance: ["Well balanced", "Somewhat balanced", "Mostly work/responsibilities",
                            "Severely imbalanced"]
radio: "How often do you feel overwhelmed or burned out?"
  options: ["Rarely", "Sometimes (a few times/month)", "Often (weekly)",
            "Almost constantly"]
yes-no: "Do you have a regular relaxation practice?"
```

### stress-symptoms-current-state
```
checkbox-group: ["Irritability or mood swings", "Anxiety or worry", "Low mood/depression",
  "Brain fog / difficulty concentrating", "Forgetfulness", "Muscle tension or headaches",
  "Jaw clenching/teeth grinding", "Digestive upset", "Fatigue despite adequate sleep",
  "Increased appetite or cravings", "Decreased appetite", "Social withdrawal",
  "None of the above"]
rating-10: "Overall current stress level (1 = very low, 10 = extreme)"
```

### relationships-quality
```
radio: "How would you rate your closest personal relationships overall?"
  options: ["Excellent — very supportive", "Good — mostly positive",
            "Fair — some tension/challenges", "Poor — significant difficulties"]
radio: "Do you have people you can turn to for emotional support?"
  options: ["Yes, reliably", "Sometimes", "Rarely", "No"]
```

### relationships-habits
```
radio social connection frequency: ["Daily meaningful connection", "Several times a week",
  "About once a week", "A few times a month", "Rarely"]
yes-no: "Do you feel lonely or isolated?"
yes-no: "Are relationship stressors a significant source of stress for you?"
```

### purpose-clarity-of-vision
```
radio: "How clearly defined are your personal life goals?"
  options: ["Very clear — I know exactly what I'm working toward",
            "Somewhat clear — general direction but not specific",
            "Unclear — still figuring it out",
            "I haven't thought much about this"]
text: "What does living a healthy, fulfilling life look like to you? (brief description)"
```

### purpose-assessment
```
radio sense of purpose: ["Strong — I feel my life has clear meaning",
  "Moderate — I have some sense of purpose",
  "Weak — I often feel directionless",
  "Absent — I struggle to find meaning"]
yes-no: "Do your daily activities align with your core values?"
text: "What motivates you most to improve your health?"
```

### metabolic-flexibility-assessment
```
radio: "How do you feel between meals (if you go 4-5 hours without eating)?"
  options: ["Fine — no hunger or energy dips", "Mild hunger but manageable",
            "Significant hunger and energy dip", "Irritable, shaky, or unable to focus"]
radio: "How do you feel in the morning before eating?"
  options: ["Energized", "Neutral", "Groggy but okay after coffee",
            "Unable to function without eating immediately"]
yes-no: "Do you experience energy crashes after meals?"
yes-no: "Do you have strong cravings for carbohydrates or sugar?"
```

### metabolic-flexibility-habits
```
radio eating window: ["< 8 hours (extended fasting)", "8-10 hours", "10-12 hours",
                       "12-14 hours", "> 14 hours (eating most of the day)"]
yes-no: "Have you ever followed a ketogenic or very low-carb diet?"
yes-no: "Do you regularly eat within 1 hour of waking?"
```

### aerobics-capacity-current-state
```
radio: "How would you describe your current cardiovascular fitness?"
  options: ["Excellent — can sustain vigorous activity for 30+ min",
            "Good — comfortable with moderate activity",
            "Fair — get winded with moderate exertion",
            "Poor — short walks cause significant breathlessness"]
radio: "Can you climb 2 flights of stairs without stopping to catch your breath?"
  options: ["Yes, easily", "Yes, but I'm winded", "With difficulty", "No"]
text: "Any symptoms during exertion (chest pain, palpitations, dizziness)?"
```

### harmful-substance-habits
```
yes-no: "Do you currently smoke tobacco?"
  [if yes]: checkbox-group: ["Cigarettes", "Cigars", "Pipe", "Chewing tobacco", "E-cigarettes/vaping"]
  [if yes]: radio: ["< 5/day", "5-10/day", "11-20/day", "> 20/day"]
yes-no: "Do you drink alcohol?"
  [if yes]: radio: ["Occasionally (< 1x/week)", "1-3 drinks/week", "4-7 drinks/week",
                     "1-2 drinks/day", "> 2 drinks/day"]
yes-no: "Do you use recreational drugs or cannabis?"
  [if yes]: text: "Please describe (substance, frequency)"
yes-no: "Do you use any non-prescribed medications or supplements?"
```

### gut-health-current-state
```
checkbox-group: ["Bloating", "Gas/flatulence", "Abdominal pain or cramping",
  "Constipation (< 3 bowel movements/week)", "Diarrhea (loose stools > 3x/day)",
  "Alternating constipation and diarrhea", "Heartburn/acid reflux",
  "Nausea", "Food sensitivities/intolerances", "None of the above"]
radio bowel frequency: ["< 3x/week", "3-6x/week", "Once daily", "2-3x daily", "> 3x daily"]
radio stool consistency (Bristol): ["Type 1-2 (hard/lumpy)", "Type 3-4 (normal)",
                                      "Type 5-6 (loose)", "Type 7 (watery)"]
yes-no: "Have you taken antibiotics in the past 12 months?"
yes-no: "Do you take a probiotic supplement?"
```

### detoxification-experience
```
checkbox-group: ["Multiple chemical sensitivities", "Sensitivity to fragrances/cleaning products",
  "Poor alcohol tolerance (feel effects more than others)", "Skin rashes or hives without clear cause",
  "Frequent headaches", "Fatigue after eating certain foods",
  "Night sweats unrelated to menopause/illness", "None of the above"]
yes-no: "Have you ever been diagnosed with or tested for heavy metal toxicity?"
```

### detoxification-work
```
radio: "Which best describes your primary work environment?"
  options: ["Office / desk work (indoor)", "Indoor — industrial/manufacturing",
            "Outdoor — agriculture/landscaping", "Healthcare setting",
            "Construction / trades", "Home-based", "Other"]
yes-no: "Are you regularly exposed to chemicals, pesticides, or industrial solvents?"
yes-no: "Do you use filtered water for drinking and cooking?"
radio: "How often do you eat organic produce?"
  options: ["Always or mostly", "Sometimes", "Rarely", "Never"]
```

### inflammation-current-state
```
checkbox-group: ["Chronic joint pain or stiffness", "Persistent fatigue",
  "Recurrent skin issues (eczema, psoriasis, acne)", "Frequent infections or slow recovery",
  "Allergies (seasonal or food)", "Autoimmune diagnosis", "Brain fog",
  "Unexplained weight gain", "Puffiness or water retention", "None of the above"]
rating-10: "Overall inflammation / pain level (1 = none, 10 = severe)"
```

### mental-health-current-state
```
radio current mood: ["Generally positive and stable", "Mostly okay with occasional low days",
  "Frequently low, anxious, or irritable", "Persistently struggling"]
rating-10: "Current anxiety level (1 = very low, 10 = severe)"
rating-10: "Current depression level (1 = none, 10 = severe)"
yes-no: "Are you currently working with a mental health professional?"
yes-no: "Are you currently taking medication for mental health?"
checkbox-group: ["Difficulty concentrating", "Low motivation", "Social withdrawal",
  "Irritability or anger", "Emotional numbness", "Panic attacks",
  "Intrusive thoughts", "None of the above"]
```

### social-history-current-state
```
radio: "What is your current employment status?"
  options: ["Employed full-time", "Employed part-time", "Self-employed",
            "Retired", "Student", "Homemaker", "Unemployed/seeking work", "Disabled"]
radio: "What is your living situation?"
  options: ["Living alone", "With partner/spouse", "With family (children/parents)",
            "With roommates", "Other"]
radio: "What is your highest level of education?"
  options: ["High school / GED", "Some college", "Associate's degree",
            "Bachelor's degree", "Graduate/professional degree"]
checkbox-group: "Which of the following apply to your daily environment?"
  options: ["High-stress work", "Long commute (> 45 min each way)", "Shift work or irregular hours",
            "Caregiver responsibilities", "Financial stress", "Housing instability",
            "Food insecurity", "None of the above"]
```

### diabetes-history-objectives
```
checkbox-group: ["Prevent diabetes", "Manage blood sugar", "Reduce A1C",
  "Reduce insulin resistance", "Lose weight related to diabetes",
  "Reduce diabetes medications", "Understand my numbers better",
  "Other diabetes-related goal"]
```

### diabetes-history-diagnosis
```
radio: "Have you been diagnosed with diabetes or pre-diabetes?"
  options: ["No", "Pre-diabetes", "Type 2 Diabetes", "Type 1 Diabetes",
            "Gestational diabetes (past)", "LADA / other"]
text: "If diagnosed, when and what is your current management approach?"
radio A1C (if known): ["< 5.7% (normal)", "5.7-6.4% (pre-diabetes)",
                        "6.5-7.0%", "7.1-8.0%", "8.1-9.0%", "> 9.0%", "Don't know"]
```

### diabetes-history-family-history
```
radio: "Does diabetes run in your immediate family?"
  options: ["No family history", "One parent", "Both parents", "Siblings",
            "Multiple relatives", "Not sure"]
yes-no: "Was gestational diabetes present in your family (mother or sisters)?"
```

### diabetes-history-cultural
```
text: "Do cultural or religious practices influence your diet or lifestyle? (optional)"
radio: "What is your ethnic background? (influences metabolic risk)"
  options: ["White/Caucasian", "Hispanic/Latino", "Black/African American",
            "South Asian", "East Asian", "Southeast Asian", "Middle Eastern",
            "Indigenous/First Nations", "Mixed", "Prefer not to say"]
```

### change-readiness-readiness
```
likert-5 statements (Strongly Disagree → Strongly Agree):
1. "I am motivated to make significant changes to my lifestyle."
2. "I believe I am capable of making and sustaining these changes."
3. "I have a clear understanding of why I want to improve my health."
4. "I have the time and resources available to commit to a health program."
5. "I have support from people in my life for making these changes."
6. "I have tried to make these changes before and struggled."  (reverse-scored awareness)
7. "I am willing to track my food, activity, and habits regularly."
8. "I am ready to work with a health coach or practitioner."
9. "I expect to see meaningful results within 3-6 months."
```

---

## Section 3: Backend Changes

### 3.1 New SQLAlchemy Models (`backend/app/models/questionnaire.py`)

```python
class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    node_id = Column(String, nullable=False)
    answers = Column(JSON, nullable=False, default={})
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    __table_args__ = (UniqueConstraint("user_id", "node_id"),)

class MasterUserProfile(Base):
    __tablename__ = "master_user_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    profile_text = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=utcnow)
```

### 3.2 API Endpoints (`backend/app/routers/questionnaire.py`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/questionnaire` | All node answers for current user as `{node_id: answers}` map |
| `PUT` | `/api/v1/questionnaire/{node_id}` | Upsert answers for one node (replaces existing) |
| `GET` | `/api/v1/user-profile/master` | Returns saved master profile text + `generated_at` |
| `POST` | `/api/v1/user-profile/generate` | Calls AI service, saves result, returns profile text |

`PUT` request body:
```json
{ "answers": { "selected": ["Type 2 Diabetes"], "notes": "diagnosed 2018" } }
```

`POST /generate` logic:
1. Fetch all `QuestionnaireResponse` rows for user
2. Fetch `Profile` row (demographics)
3. Call `POST {AI_SERVICE_URL}/orchestrator/master-profile`
4. Upsert result into `MasterUserProfile`
5. Return `{ profile_text, generated_at }`

### 3.3 Pydantic Schemas (`backend/app/schemas/questionnaire.py`)

```python
class QuestionnaireAnswerUpsert(BaseModel):
    answers: dict

class QuestionnaireNodeResponse(BaseModel):
    node_id: str
    answers: dict
    updated_at: datetime

class AllQuestionnaireResponses(BaseModel):
    responses: dict[str, dict]   # {node_id: answers}

class MasterProfileResponse(BaseModel):
    profile_text: str
    generated_at: datetime
```

### 3.4 Alembic Migration

One migration file adding both `questionnaire_responses` and `master_user_profiles` tables. No changes to existing tables.

---

## Section 4: Frontend Modal Changes

### 4.1 New Question Types

```ts
export type QuestionType =
  | "text" | "number" | "select"             // existing
  | "checkbox-group" | "radio" | "yes-no"    // new
  | "likert-5" | "rating-10" | "multi-text"  // new

export interface NodeQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  placeholder?: string
  subQuestions?: NodeQuestion[]   // conditional follow-ups
}
```

### 4.2 Form Renderers

| Type | Component | Answer shape |
|------|-----------|-------------|
| `checkbox-group` | shadcn `Checkbox` list | `string[]` |
| `radio` | shadcn `RadioGroup` | `string` |
| `yes-no` | Two-button toggle | `"yes"` \| `"no"` |
| `likert-5` | 5-point labeled scale | `1`–`5` |
| `rating-10` | 1–10 button row | `1`–`10` |
| `multi-text` | Dynamic add/remove text inputs | `string[]` |

### 4.3 Answer Shape Per Node

```json
{
  "q-musculoskeletal": ["Back pain", "Arthritis"],
  "q-cardiovascular": [],
  "q-readiness-motivation": 4,
  "q-stress-coping": "Meditation",
  "q-smoking": "yes",
  "note": ""
}
```

### 4.4 Modal Flow

1. `GET /api/v1/questionnaire` called once on mind map page mount; result passed via context
2. Modal opens pre-populated with existing answers for that node
3. User edits → clicks **Save** → `PUT /api/v1/questionnaire/{node_id}`
4. On save success: node `metadata.completion` set to `"complete"`, filled-dot indicator shown
5. **Cancel** discards changes (no auto-save on close)

### 4.5 New API Client Functions (`frontend/lib/api-client.ts`)

```ts
fetchAllQuestionnaireAnswers(): Promise<Record<string, Record<string, unknown>>>
saveNodeAnswers(nodeId: string, answers: Record<string, unknown>): Promise<void>
generateMasterProfile(): Promise<{ profile_text: string; generated_at: string }>
fetchMasterProfile(): Promise<{ profile_text: string; generated_at: string } | null>
```

---

## Section 5: User Profile Page

### 5.1 Sidebar Entry

File: `frontend/app/components/nav-bar.tsx`
- Add nav item: `{ href: "/user-profile", label: "User Profile", icon: UserCircle2 }`

### 5.2 Page Layout (`/app/user-profile/page.tsx`)

```
┌─────────────────────────────────────────────┐
│  User Profile                    [Generate] │
├─────────────────────────────────────────────┤
│  Last generated: April 3, 2026              │
├─────────────────────────────────────────────┤
│                                             │
│  Narrative profile text (markdown)          │
│     — or —                                  │
│  Empty state with instructions              │
│                                             │
└─────────────────────────────────────────────┘
│  [Print / Export PDF]  (sticky footer)      │
└─────────────────────────────────────────────┘
```

### 5.3 Generate Button

1. Click → loading state "Generating…"
2. Call `POST /api/v1/user-profile/generate`
3. On success: render markdown, show `generated_at` timestamp
4. On error: shadcn toast, button re-enabled
5. Regeneration overwrites existing — no confirmation prompt

### 5.4 Profile Text Rendering

- `react-markdown` (or existing markdown renderer in project)
- AI-generated sections: Demographics & Goals, Medical History Summary, Lifestyle Snapshot, Key Risk Factors, Behavioral Readiness, Recommendations Summary

### 5.5 Print / Export PDF

- `window.print()` with `@media print` CSS
- Print output: sidebar, buttons, nav hidden; profile text full-width
- Page break before lab charts section
- Lab trend chart components rendered with `printMode` prop (static snapshot, no interactivity)
- Charts with no data omitted from print

---

## Section 6: AI Integration

### 6.1 New AI Service Endpoint (`ai-services/app/orchestrator/profile_agent.py`)

`POST /orchestrator/master-profile`

Request:
```json
{
  "user_id": 42,
  "demographics": { "name": "...", "age": 45, "gender": "Male", ... },
  "questionnaire": {
    "past-medical-history-cardiovascular": { "selected": ["Hypertension"] },
    "sleep-habits": { "q-sleep-hours": "6" }
  }
}
```

System prompt instructs the model to produce a structured narrative with sections:
1. Demographics & Goals
2. Medical History Summary
3. Lifestyle Snapshot
4. Key Risk Factors
5. Behavioral Readiness & Motivation
6. Personalized Recommendations Summary

Instructions: reference actual patient answers; be clinically precise but accessible; state "Not reported" for missing sections.

Returns: `{ "profile_text": "## Demographics & Goals\n..." }`

### 6.2 Updated Orchestrator Context (`ai-services/app/orchestrator/orchestrator.py`)

```python
context = {
    "user_profile": basic_demographics,
    "master_profile": master_profile_text or "",    # NEW
    "questionnaire_summary": questionnaire_answers,  # NEW
    "health_metrics": [...],
    "lab_records": [...],
    "adherence_signals": [...]
}
```

Meal and activity agent system prompts updated with:
> "If a Master User Profile is provided, treat it as the primary source of truth for the patient's medical history, lifestyle, readiness, and preferences. Use it to personalize recommendations — reference specific conditions, habits, and goals."

---

## Out of Scope

- Real-time streaming of profile generation (one-shot call, result stored)
- Versioning or history of previous profile generations
- Per-question partial saves (entire node saved as one unit)
- Third-party PDF generation libraries (browser print-to-PDF only)
