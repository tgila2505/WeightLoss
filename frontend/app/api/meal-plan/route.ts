import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface MealPlanRequest {
  userPrompt: string;
  profileSummary: string;
}

export interface MealEntry {
  meal: string;
  name: string;
}

export interface MealPlanResponse {
  meals: MealEntry[];
}

const SYSTEM_PROMPT = `You are a professional nutritionist and dietitian.
Generate a complete personalised 7-day meal plan based on the user's request and profile.

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just JSON:
{
  "meals": [
    { "meal": "Breakfast", "name": "Full meal name with brief description" },
    { "meal": "Morning Snack", "name": "..." },
    { "meal": "Lunch", "name": "..." },
    { "meal": "Afternoon Snack", "name": "..." },
    { "meal": "Dinner", "name": "..." }
  ]
}

Rules:
- Include EXACTLY 35 entries (7 days × 5 meals per day).
- Each new day MUST start with "Breakfast" — this is how days are separated.
- Meal type labels must be exactly: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner.
- Vary the meals across all 7 days — no dish should repeat.
- Strictly follow any cultural, dietary, or religious preferences in the user's request (e.g. Pakistani, halal, vegetarian, etc.).
- MANDATORY: Every meal name MUST include portion size, calories, and protein. Use this exact format: "Meal Name (portion: 200g / 1 cup, 350 cal, 12g protein)". No exceptions — never omit these values.
- Consider the user's weight-loss goals and health conditions when choosing portions and ingredients.`;

async function callGroq(
  userPrompt: string,
  profileSummary: string,
  apiKey: string,
): Promise<MealEntry[]> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User profile:\n${profileSummary}\n\nUser request:\n${userPrompt}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { meals?: MealEntry[] };
  return parsed.meals ?? [];
}

async function callMistral(
  userPrompt: string,
  profileSummary: string,
  apiKey: string,
): Promise<MealEntry[]> {
  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User profile:\n${profileSummary}\n\nUser request:\n${userPrompt}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { meals?: MealEntry[] };
  return parsed.meals ?? [];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  let body: MealPlanRequest;

  try {
    body = await request.json() as MealPlanRequest;
  } catch {
    console.error('[meal-plan] Failed to parse request body');
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userPrompt, profileSummary } = body;
  const groqKey = process.env.GROQ_API_KEY ?? null;
  const mistralKey = process.env.MISTRAL_API_KEY ?? null;

  if (!userPrompt?.trim()) {
    return NextResponse.json({ error: 'userPrompt is required' }, { status: 400 });
  }

  if (!groqKey && !mistralKey) {
    console.warn('[meal-plan] Request rejected — no AI keys configured in environment');
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact support.' },
      { status: 503 },
    );
  }

  const provider = groqKey ? 'groq' : 'mistral';
  console.log(`[meal-plan] Generating 7-day plan via ${provider}`);

  try {
    let meals: MealEntry[] = [];
    let usedProvider = provider;

    if (groqKey) {
      try {
        meals = await callGroq(userPrompt, profileSummary, groqKey);
      } catch (groqError) {
        console.warn('[meal-plan] Groq failed, falling back to Mistral:', groqError);
        if (!mistralKey) throw groqError;
        meals = await callMistral(userPrompt, profileSummary, mistralKey);
        usedProvider = 'mistral';
      }
    } else if (mistralKey) {
      meals = await callMistral(userPrompt, profileSummary, mistralKey);
    }

    if (meals.length === 0) {
      console.error(`[meal-plan] ${usedProvider} returned empty meals array`);
      return NextResponse.json(
        { error: 'AI returned an empty meal plan. Please try again.' },
        { status: 502 },
      );
    }

    const elapsed = Date.now() - start;
    console.log(
      `[meal-plan] Success via ${usedProvider} — ${meals.length} meals in ${elapsed}ms`,
    );

    return NextResponse.json({ meals } satisfies MealPlanResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(`[meal-plan] Error after ${Date.now() - start}ms:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
