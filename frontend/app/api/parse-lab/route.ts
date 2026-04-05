import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface ParsedLabEntry {
  test_name: string;
  value: number;
  unit: string | null;
  reference_range: string | null;
  recorded_date: string; // YYYY-MM-DD
}

export interface ParseLabResponse {
  records: ParsedLabEntry[];
  service_date: string | null;
}

const SYSTEM_PROMPT = `You are a medical laboratory data extraction specialist.
Extract all lab test results from the provided lab report image or text.

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just JSON:
{
  "service_date": "YYYY-MM-DD or null if not found",
  "records": [
    {
      "test_name": "Full test name (e.g. Glucose, HbA1c, Creatinine)",
      "value": 5.4,
      "unit": "mmol/L or null",
      "reference_range": "3.9-6.1 or null"
    }
  ]
}

Rules:
- Extract EVERY numeric lab result you can find.
- Normalise test names to standard medical names (e.g. "HbA1c" not "Glycated Haemoglobin").
- value must be a number — parse "< 0.5" as 0.5, "> 10" as 10.
- If a reference range is present capture it exactly (e.g. "3.5-5.0", "< 200", "> 40").
- Set service_date to the collection date on the report if visible (YYYY-MM-DD format).
- If no collection date is visible, set service_date to null.
- Never include non-numeric results (e.g. "Negative", "Positive").`;

async function callGroqVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<ParsedLabEntry[]> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Please extract all lab results from this report.',
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq vision error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { records?: ParsedLabEntry[]; service_date?: string };
  return parsed.records ?? [];
}

async function callMistralVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<ParsedLabEntry[]> {
  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'pixtral-large-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Please extract all lab results from this report.',
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral vision error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { records?: ParsedLabEntry[]; service_date?: string };
  return parsed.records ?? [];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const groqKey = request.headers.get('x-groq-key');
  const mistralKey = request.headers.get('x-mistral-key');

  if (!groqKey && !mistralKey) {
    console.warn('[parse-lab] Rejected — no AI keys provided');
    return NextResponse.json(
      { error: 'No AI API key provided. Add your Groq or Mistral key in Settings.' },
      { status: 422 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    console.error('[parse-lab] Failed to parse form data');
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const serviceDate = formData.get('service_date') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const mimeType = file.type || 'image/jpeg';

  if (!allowedTypes.includes(mimeType)) {
    console.warn(`[parse-lab] Unsupported file type: ${mimeType}`);
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image of your lab report.' },
      { status: 400 },
    );
  }

  const provider = groqKey ? 'groq' : 'mistral';
  console.log(`[parse-lab] Parsing lab report via ${provider} (file: ${file.name}, size: ${file.size}B)`);

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  try {
    let records: ParsedLabEntry[] = [];
    let usedProvider = provider;

    if (groqKey) {
      try {
        records = await callGroqVision(base64, mimeType, groqKey);
      } catch (groqError) {
        console.warn('[parse-lab] Groq vision failed, falling back to Mistral:', groqError);
        if (!mistralKey) throw groqError;
        records = await callMistralVision(base64, mimeType, mistralKey);
        usedProvider = 'mistral';
      }
    } else if (mistralKey) {
      records = await callMistralVision(base64, mimeType, mistralKey);
    }

    const finalDate = serviceDate ?? new Date().toISOString().slice(0, 10);
    const finalRecords: ParsedLabEntry[] = records.map((r) => ({
      ...r,
      recorded_date: finalDate,
    }));

    if (finalRecords.length === 0) {
      console.warn(`[parse-lab] ${usedProvider} returned no extractable records`);
      return NextResponse.json(
        { error: 'No lab results could be extracted. Please ensure the image is clear and contains numeric test results.' },
        { status: 422 },
      );
    }

    const elapsed = Date.now() - start;
    console.log(`[parse-lab] Success via ${usedProvider} — ${finalRecords.length} records in ${elapsed}ms`);
    return NextResponse.json({ records: finalRecords, service_date: finalDate } satisfies ParseLabResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(`[parse-lab] Error after ${Date.now() - start}ms:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
