import { getGroqKey, getMistralKey } from './ai-keys';
import { getAccessToken } from './auth';

export type OnboardingPayload = {
  name: string;
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  goal_target_weight_kg: string;
  goal_timeline_weeks: string;
  health_conditions: string;
  activity_level: string;
  sleep_hours: string;
  diet_pattern: string;
};

type ProfileRequest = {
  name: string;
  age: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  goal_target_weight_kg?: number;
  goal_timeline_weeks?: number;
  health_conditions?: string;
  activity_level?: string;
  sleep_hours?: number;
  diet_pattern?: string;
};

export type ProfileResponse = {
  id: number;
  user_id: number;
  name: string;
  age: number;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal_target_weight_kg?: number | null;
  goal_timeline_weeks?: number | null;
  health_conditions?: string | null;
  activity_level?: string | null;
  sleep_hours?: number | null;
  diet_pattern?: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthMetricResponse = {
  id: number;
  user_id: number;
  weight_kg: number;
  bmi?: number | null;
  steps?: number | null;
  sleep_hours?: number | null;
  height_cm?: number | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  processed: {
    weight_unit: string;
    height_unit?: string | null;
    sleep_unit?: string | null;
    derived_bmi?: number | null;
    weight_trend: string;
    bmi_trend: string;
  };
};

export type LabRecordResponse = {
  id: number;
  user_id: number;
  test_name: string;
  value: number;
  unit?: string | null;
  reference_range?: string | null;
  recorded_date: string;
  created_at: string;
  updated_at: string;
  processed: {
    normalized_value: number;
    normalized_unit?: string | null;
    trend: string;
  };
  evaluation: {
    normalized_test_name?: string | null;
    status: string;
    is_abnormal: boolean;
    rule_applied: boolean;
  };
};

export type PlanSnapshot = {
  intent: string;
  meals: Array<{ meal: string; name: string }>;
  activity: Array<{ title: string; frequency: string }>;
  behavioral_actions: string[];
  lab_insights: Array<{ test_name: string; status: string; summary: string }>;
  risks: Array<{ code: string; description: string; status: string }>;
  recommendations: string[];
  adherence_signals: Array<{ name: string; completed: boolean; score?: number | null }>;
  constraints_applied: string[];
  biomarker_adjustments: string[];
};

export type AdherenceRecordResponse = {
  id: number;
  user_id: number;
  item_type: string;
  item_name: string;
  completed: boolean;
  adherence_date: string;
  score?: number | null;
  created_at: string;
  updated_at: string;
};

type AdherenceRecordCreate = {
  item_type: string;
  item_name: string;
  completed: boolean;
  adherence_date: string;
  score?: number | null;
};

export type MindMapAnswerValue = string | number | string[];

export type MindMapAnswerRecord = {
  userId: number;
  nodeId: string;
  completed: boolean;
  answers: Record<string, MindMapAnswerValue>;
  savedAt: string;
};

type StoredPlanResponse = {
  id: number;
  user_id: number;
  title: string;
  status: string;
  plan: PlanSnapshot;
  created_at: string;
  updated_at: string;
};

export type AdaptiveAdjustment = {
  meal_adjustment: string;
  activity_adjustment: string;
  action_adjustment: string;
};

export type AdherenceSummaryResponse = {
  adherence_score: number;
  consistency_level: string;
  completed_records: number;
  total_records: number;
  adjustments: AdaptiveAdjustment;
  plan_refresh_needed: boolean;
};

export type ReminderResponse = {
  id: number;
  user_id: number;
  reminder_type: string;
  title: string;
  scheduled_time: string;
  cadence: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ReminderCreate = {
  reminder_type: string;
  title: string;
  scheduled_time: string;
  cadence?: string;
  is_active?: boolean;
};

export type OrchestratorResponse = {
  content: string;
  status: string;
  data: Record<string, unknown>;
  metadata: {
    final_plan?: PlanSnapshot;
    retrieved_recommendations?: Array<{
      id: string;
      score: number;
      text: string;
      metadata: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  };
  error?: string | null;
};

export type OrchestratorIntent = 'dashboard' | 'meal_plan' | 'tracking' | 'question';

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const aiServicesBaseUrl =
  process.env.NEXT_PUBLIC_AI_SERVICES_BASE_URL ?? 'http://localhost:8001';
const sessionPlanKey = 'latest_plan_snapshot';
const sessionInteractionKey = 'interaction_history';

export async function upsertProfile(payload: OnboardingPayload): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before completing onboarding.');
  }

  const body = serializeProfile(payload);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const createResponse = await fetch(`${apiBaseUrl}/api/v1/profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (createResponse.ok) {
    return;
  }

  if (createResponse.status === 409) {
    const updateResponse = await fetch(`${apiBaseUrl}/api/v1/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (updateResponse.ok) {
      return;
    }

    throw new Error(await readError(updateResponse));
  }

  throw new Error(await readError(createResponse));
}

export async function fetchProfile(): Promise<ProfileResponse | null> {
  return requestWithOptional404<ProfileResponse>(`${apiBaseUrl}/api/v1/profile`);
}

export async function fetchHealthMetrics(): Promise<HealthMetricResponse[]> {
  return request<HealthMetricResponse[]>(`${apiBaseUrl}/api/v1/health-metrics`);
}

export async function fetchLabs(): Promise<LabRecordResponse[]> {
  return request<LabRecordResponse[]>(`${apiBaseUrl}/api/v1/labs`);
}

export type LabRecordCreate = {
  test_name: string;
  value: number;
  unit?: string | null;
  reference_range?: string | null;
  recorded_date: string; // YYYY-MM-DD
};

export async function createLabRecord(payload: LabRecordCreate): Promise<LabRecordResponse> {
  return requestWithBody<LabRecordResponse>(`${apiBaseUrl}/api/v1/labs`, payload);
}

export async function submitOrchestratorRequest(input: {
  prompt: string;
  intent: OrchestratorIntent;
  profile: ProfileResponse | null;
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  adherenceSignals?: Array<{ name: string; completed: boolean; score?: number | null }>;
  consistencyLevel?: string | null;
  adaptiveAdjustment?: AdaptiveAdjustment | null;
}): Promise<OrchestratorResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before using the assistant.');
  }

  // Fetch master profile to enrich orchestrator context (non-blocking)
  let masterProfileText = '';
  try {
    const masterProfile = await fetchMasterProfile();
    masterProfileText = masterProfile?.profile_text ?? '';
  } catch {
    // non-blocking — orchestrator still works without it
  }

  const response = await fetch(`${aiServicesBaseUrl}/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      context: {
        prompt: input.prompt,
        intent: input.intent,
        user_profile: input.profile
          ? {
              user_id: input.profile.user_id,
              age: input.profile.age,
              gender: input.profile.gender,
              height_cm: input.profile.height_cm,
              weight_kg: input.profile.weight_kg,
              conditions: splitCommaSeparated(input.profile.health_conditions),
              dietary_restrictions: splitCommaSeparated(input.profile.diet_pattern),
              dietary_preferences: splitCommaSeparated(input.profile.activity_level)
            }
          : null,
        health_metrics: input.metrics.map((metric) => ({
          weight_kg: metric.weight_kg,
          bmi: metric.bmi,
          steps: metric.steps,
          sleep_hours: metric.sleep_hours,
          weight_trend: metric.processed.weight_trend,
          bmi_trend: metric.processed.bmi_trend,
          recorded_at: metric.recorded_at
        })),
        lab_records: input.labs.map((lab) => ({
          test_name: lab.test_name,
          value: lab.value,
          unit: lab.unit,
          status: lab.evaluation.status,
          trend: lab.processed.trend,
          recorded_date: lab.recorded_date
        })),
        adherence_signals: input.adherenceSignals ?? [],
        master_profile: masterProfileText || null,
        consistency_level: input.consistencyLevel ?? null,
        adaptive_adjustment: input.adaptiveAdjustment ?? null,
        groq_api_key: getGroqKey() ?? null,
        mistral_api_key: getMistralKey() ?? null
      }
    })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as OrchestratorResponse;
}

export async function persistLatestPlan(plan: PlanSnapshot): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before saving a plan.');
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Latest plan',
      status: 'active',
      plan
    })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export function saveLatestPlan(plan: PlanSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(sessionPlanKey, JSON.stringify(plan));
}

export function getLatestPlan(): PlanSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(sessionPlanKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlanSnapshot;
  } catch {
    return null;
  }
}

export async function fetchTodayPlan(): Promise<PlanSnapshot | null> {
  const response = await requestWithOptional404<StoredPlanResponse>(
    `${apiBaseUrl}/api/v1/plans/today`
  );
  return response?.plan ?? null;
}

export async function createAdherenceRecord(
  payload: AdherenceRecordCreate
): Promise<AdherenceRecordResponse> {
  return requestWithBody<AdherenceRecordResponse>(`${apiBaseUrl}/api/v1/adherence`, payload);
}

export async function fetchAdherenceSummary(): Promise<AdherenceSummaryResponse | null> {
  return requestWithOptional404<AdherenceSummaryResponse>(
    `${apiBaseUrl}/api/v1/adherence/summary`
  );
}

export async function fetchReminders(): Promise<ReminderResponse[]> {
  return request<ReminderResponse[]>(`${apiBaseUrl}/api/v1/reminders`);
}

export async function createReminder(payload: ReminderCreate): Promise<ReminderResponse> {
  return requestWithBody<ReminderResponse>(`${apiBaseUrl}/api/v1/reminders`, payload);
}

export async function fetchAdherenceRecords(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AdherenceRecordResponse[]> {
  const query = new URLSearchParams();
  if (params?.startDate) {
    query.set('start_date', params.startDate);
  }
  if (params?.endDate) {
    query.set('end_date', params.endDate);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return request<AdherenceRecordResponse[]>(`${apiBaseUrl}/api/v1/adherence${suffix}`);
}

const mindMapItemType = 'mindmap_node';

export async function saveMindMapAnswers(input: {
  nodeId: string;
  answers: Record<string, MindMapAnswerValue>;
  completed?: boolean;
}): Promise<MindMapAnswerRecord> {
  const now = new Date().toISOString();
  const payload = {
    n: input.nodeId,
    a: input.answers,
    s: now
  };

  const record = await createAdherenceRecord({
    item_type: mindMapItemType,
    item_name: JSON.stringify(payload),
    completed: input.completed ?? true,
    adherence_date: now.slice(0, 10),
    score: 100
  });

  return {
    userId: record.user_id,
    nodeId: input.nodeId,
    completed: record.completed,
    answers: input.answers,
    savedAt: now
  };
}

export async function fetchMindMapAnswers(): Promise<MindMapAnswerRecord[]> {
  const records = await fetchAdherenceRecords();
  const latestByNodeId = new Map<string, MindMapAnswerRecord>();

  for (const record of records) {
    if (record.item_type !== mindMapItemType) {
      continue;
    }

    const parsed = parseMindMapItem(record);
    if (!parsed) {
      continue;
    }

    const current = latestByNodeId.get(parsed.nodeId);
    if (!current || new Date(parsed.savedAt).getTime() > new Date(current.savedAt).getTime()) {
      latestByNodeId.set(parsed.nodeId, parsed);
    }
  }

  return Array.from(latestByNodeId.values());
}

export async function fetchAllQuestionnaireAnswers(): Promise<Record<string, Record<string, MindMapAnswerValue>>> {
  const data = await request<{ responses: Record<string, Record<string, MindMapAnswerValue>> }>(
    `${apiBaseUrl}/api/v1/questionnaire`
  );
  return data.responses;
}

export async function saveNodeAnswers(
  nodeId: string,
  answers: Record<string, MindMapAnswerValue>
): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before saving answers.');
  }
  const response = await fetch(
    `${apiBaseUrl}/api/v1/questionnaire/${encodeURIComponent(nodeId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    }
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function generateMasterProfile(): Promise<{ profile_text: string; generated_at: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before generating a master profile.');
  }
  const groqKey = getGroqKey();
  const mistralKey = getMistralKey();
  const aiHeaders: Record<string, string> = {};
  if (groqKey) aiHeaders['x-groq-key'] = groqKey;
  if (mistralKey) aiHeaders['x-mistral-key'] = mistralKey;

  const response = await fetch(`${apiBaseUrl}/api/v1/user-profile/generate`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...aiHeaders,
    },
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { profile_text: string; generated_at: string };
}

export async function fetchMasterProfile(): Promise<{ profile_text: string; generated_at: string } | null> {
  return requestWithOptional404<{ profile_text: string; generated_at: string }>(
    `${apiBaseUrl}/api/v1/user-profile/master`
  );
}

export type InteractionHistoryItem = {
  prompt: string;
  reply: string;
  created_at: string;
};

export function getInteractionHistory(): InteractionHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.sessionStorage.getItem(sessionInteractionKey);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as InteractionHistoryItem[];
  } catch {
    return [];
  }
}

export function appendInteractionHistory(item: InteractionHistoryItem): void {
  if (typeof window === 'undefined') {
    return;
  }

  const history = getInteractionHistory();
  history.unshift(item);
  window.sessionStorage.setItem(
    sessionInteractionKey,
    JSON.stringify(history.slice(0, 10))
  );
}

function serializeProfile(payload: OnboardingPayload): ProfileRequest {
  return {
    name: payload.name.trim(),
    age: Number(payload.age),
    gender: optionalString(payload.gender),
    height_cm: optionalNumber(payload.height_cm),
    weight_kg: optionalNumber(payload.weight_kg),
    goal_target_weight_kg: optionalNumber(payload.goal_target_weight_kg),
    goal_timeline_weeks: optionalInteger(payload.goal_timeline_weeks),
    health_conditions: optionalString(payload.health_conditions),
    activity_level: optionalString(payload.activity_level),
    sleep_hours: optionalNumber(payload.sleep_hours),
    diet_pattern: optionalString(payload.diet_pattern)
  };
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return Number(value);
}

function optionalInteger(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return parseInt(value, 10);
}

async function readError(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'SESSION_EXPIRED';
  }
  try {
    const data = (await response.json()) as {
      detail?: string | Array<{ msg?: string; message?: string }>;
      error?: { message?: string };
    };

    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => d.msg ?? d.message ?? 'Unknown error').join(', ');
    }

    return data.detail ?? data.error?.message ?? 'Request failed.';
  } catch {
    return 'Request failed.';
  }
}

async function request<T>(url: string): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before viewing this data.');
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

async function requestWithBody<T>(url: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before updating this data.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

async function requestWithOptional404<T>(url: string): Promise<T | null> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be logged in before viewing this data.');
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

function splitCommaSeparated(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMindMapItem(
  record: AdherenceRecordResponse
): MindMapAnswerRecord | null {
  try {
    const parsed = JSON.parse(record.item_name) as {
      n?: unknown;
      a?: unknown;
      s?: unknown;
    };

    if (typeof parsed.n !== 'string' || !isPlainObject(parsed.a)) {
      return null;
    }

    const answers: Record<string, MindMapAnswerValue> = {};

    for (const [key, value] of Object.entries(parsed.a)) {
      if (typeof value === 'string' || typeof value === 'number') {
        answers[key] = value;
      }
    }

    return {
      userId: record.user_id,
      nodeId: parsed.n,
      completed: record.completed,
      answers,
      savedAt: typeof parsed.s === 'string' ? parsed.s : record.updated_at
    };
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
