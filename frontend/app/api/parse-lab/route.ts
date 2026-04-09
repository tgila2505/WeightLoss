import { NextRequest, NextResponse } from 'next/server';
import { getAiKeysFromBackend } from '@/lib/ai-keys-server';
import { PDFParse } from 'pdf-parse';

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

interface AIParseResult {
  records: ParsedLabEntry[];
  service_date: string | null;
}

const SYSTEM_PROMPT = `You are a medical laboratory data extraction specialist.
Extract all lab test results from the provided lab report.

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
- ONLY include tests that have an actual numeric result present. If the result column is blank, empty, or contains only a unit string (e.g. "fl", "ug/L"), SKIP that test entirely — do not include it.
- Normalise test names to standard medical names (e.g. "HbA1c" not "Glycated Haemoglobin").
- value MUST be a JSON number (not a string). Parse "< 0.5" as 0.5, "> 10" as 10, "0" as 0.
- If a reference range is present capture it exactly (e.g. "3.5-5.0", "< 200", "> 40").
- Set service_date to the collection/service date on the report if visible (YYYY-MM-DD format).
- If no collection date is visible, set service_date to null.
- Never include non-numeric results (e.g. "Negative", "Positive", unit-only strings).`;

/** Extract the first numeric value from a mixed string, e.g. ">10" → 10, "6.3" → 6.3 */
function coerceToNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/-?\d+(\.\d+)?/);
    if (match) {
      const n = parseFloat(match[0]);
      return isFinite(n) ? n : null;
    }
  }
  return null;
}

function parseAIResponse(content: string): AIParseResult {
  const parsed = JSON.parse(content) as {
    records?: Array<Record<string, unknown>>;
    service_date?: string | null;
  };

  const raw = parsed.records ?? [];
  const records: ParsedLabEntry[] = [];

  for (const r of raw) {
    const value = coerceToNumber(r.value);
    if (value === null) continue; // skip blank / unit-only / non-numeric rows
    records.push({
      test_name: String(r.test_name ?? '').trim(),
      value,
      unit: r.unit != null ? String(r.unit).trim() || null : null,
      reference_range: r.reference_range != null ? String(r.reference_range).trim() || null : null,
      recorded_date: '',
    });
  }

  return {
    records,
    service_date: parsed.service_date ?? null,
  };
}

async function callGroqVision(imageBase64: string, mimeType: string, apiKey: string): Promise<AIParseResult> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: 'Please extract all lab results from this report.' },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) throw new Error(`Groq vision error ${response.status}: ${await response.text()}`);

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return parseAIResponse(data.choices[0]?.message?.content ?? '{}');
}

async function callMistralVision(imageBase64: string, mimeType: string, apiKey: string): Promise<AIParseResult> {
  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'pixtral-large-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: 'Please extract all lab results from this report.' },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) throw new Error(`Mistral vision error ${response.status}: ${await response.text()}`);

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return parseAIResponse(data.choices[0]?.message?.content ?? '{}');
}

async function callGroqText(text: string, apiKey: string): Promise<AIParseResult> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Please extract all lab results from this report:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) throw new Error(`Groq text error ${response.status}: ${await response.text()}`);

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return parseAIResponse(data.choices[0]?.message?.content ?? '{}');
}

async function callMistralText(text: string, apiKey: string): Promise<AIParseResult> {
  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Please extract all lab results from this report:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) throw new Error(`Mistral text error ${response.status}: ${await response.text()}`);

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return parseAIResponse(data.choices[0]?.message?.content ?? '{}');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const { groq: groqKey, mistral: mistralKey } = await getAiKeysFromBackend();

  if (!groqKey && !mistralKey) {
    console.warn('[parse-lab] Rejected — no AI keys configured in environment');
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact support.' },
      { status: 503 },
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
  // UI-selected date — takes priority over whatever is found in the document
  const uiServiceDate = (formData.get('service_date') as string | null) || null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const mimeType = file.type || 'application/octet-stream';
  const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!isPdf && !allowedImageTypes.includes(mimeType)) {
    console.warn(`[parse-lab] Unsupported file type: ${mimeType}`);
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a JPEG, PNG, WebP image or a PDF of your lab report.' },
      { status: 400 },
    );
  }

  const provider = groqKey ? 'groq' : 'mistral';
  console.log(`[parse-lab] Parsing ${isPdf ? 'PDF' : 'image'} via ${provider} (file: ${file.name}, size: ${file.size}B)`);

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let aiResult: AIParseResult = { records: [], service_date: null };
    let usedProvider = provider;

    if (isPdf) {
      // Extract text from PDF, then send to AI as text
      let pdfText: string;
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        pdfText = result.text;
        await parser.destroy();
        if (!pdfText.trim()) {
          return NextResponse.json(
            { error: 'Could not extract text from the PDF. The file may be scanned as an image — please try a text-based PDF.' },
            { status: 422 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Failed to read the PDF file. Please ensure it is a valid, non-password-protected PDF.' },
          { status: 422 },
        );
      }

      if (groqKey) {
        try {
          aiResult = await callGroqText(pdfText, groqKey);
        } catch (groqError) {
          console.warn('[parse-lab] Groq text failed, falling back to Mistral:', groqError);
          if (!mistralKey) throw groqError;
          aiResult = await callMistralText(pdfText, mistralKey);
          usedProvider = 'mistral';
        }
      } else if (mistralKey) {
        aiResult = await callMistralText(pdfText, mistralKey);
      }
    } else {
      // Image: use vision models
      const base64 = buffer.toString('base64');
      if (groqKey) {
        try {
          aiResult = await callGroqVision(base64, mimeType, groqKey);
        } catch (groqError) {
          console.warn('[parse-lab] Groq vision failed, falling back to Mistral:', groqError);
          if (!mistralKey) throw groqError;
          aiResult = await callMistralVision(base64, mimeType, mistralKey);
          usedProvider = 'mistral';
        }
      } else if (mistralKey) {
        aiResult = await callMistralVision(base64, mimeType, mistralKey);
      }
    }

    // Service date priority: UI selection → date found in document → today
    const today = new Date().toISOString().slice(0, 10);
    const finalDate = uiServiceDate ?? aiResult.service_date ?? today;

    const finalRecords: ParsedLabEntry[] = aiResult.records.map((r) => ({
      ...r,
      recorded_date: finalDate,
    }));

    if (finalRecords.length === 0) {
      console.warn(`[parse-lab] ${usedProvider} returned no extractable records`);
      return NextResponse.json(
        { error: 'No lab results could be extracted. Please ensure the file contains numeric test results.' },
        { status: 422 },
      );
    }

    const elapsed = Date.now() - start;
    console.log(`[parse-lab] Success via ${usedProvider} — ${finalRecords.length} records in ${elapsed}ms (date: ${finalDate})`);
    return NextResponse.json({ records: finalRecords, service_date: finalDate } satisfies ParseLabResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(`[parse-lab] Error after ${Date.now() - start}ms:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
