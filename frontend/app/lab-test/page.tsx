'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Download, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/app/components/page-shell';
import {
  createLabRecord,
  fetchLabs,
  fetchProfile,
  type LabRecordCreate,
  type LabRecordResponse,
  type ProfileResponse,
} from '@/lib/api-client';
import { getGroqKey, getMistralKey } from '@/lib/ai-keys';
import type { ParsedLabEntry } from '@/app/api/parse-lab/route';

// Tests ordered on the requisition
const REQUISITION_TESTS = [
  {
    section: 'Biochemistry',
    tests: [
      'Glucose (Fasting)',
      'HbA1c',
      'Creatinine (eGFR)',
      'Uric Acid',
      'ALT',
      'Lipid Assessment (Cholesterol, HDL-C, Triglycerides, LDL-C)',
      'Albumin/Creatinine Ratio (Urine)',
    ],
  },
  {
    section: 'Other Tests',
    tests: ['Ferritin', 'GGT', 'hsCRP', 'C-peptide (Not Citrullinated peptide Ab)', 'Vitamin B12'],
  },
];

function buildRequisitionBlob(profile: ProfileResponse | null, serviceDate: string): Blob {
  const today = new Date().toLocaleDateString('en-CA');
  const name = profile?.name ?? '';

  const testSections = REQUISITION_TESTS.map(
    ({ section, tests }) =>
      `<div class="section">
        <div class="section-title">${section}</div>
        ${tests.map((t) => `<div class="test-row"><span class="check">&#10003;</span><span>${t}</span></div>`).join('')}
      </div>`,
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Lab Requisition</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:24px;color:#111}
  h1{font-size:18px;font-weight:bold;margin:0 0 4px}
  .subtitle{color:#555;margin-bottom:20px;font-size:11px}
  .patient-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;border:1px solid #ccc;padding:12px;border-radius:4px}
  .patient-field label{font-size:10px;color:#666;display:block}
  .patient-field span{font-weight:600;font-size:12px}
  .full{grid-column:span 2}
  .section{margin-bottom:16px}
  .section-title{font-weight:bold;font-size:12px;background:#f0f0f0;padding:4px 8px;margin-bottom:4px}
  .test-row{display:flex;align-items:center;gap:8px;padding:3px 8px;border-bottom:1px solid #eee}
  .check{color:#1a56db;font-weight:bold;font-size:14px}
  .service-date{font-size:11px;color:#555;margin-bottom:16px}
  .note{margin-top:24px;font-size:10px;color:#666;border-top:1px solid #ddd;padding-top:8px}
</style>
</head>
<body>
<h1>Laboratory Requisition</h1>
<div class="subtitle">WeightLoss Health Program &mdash; Pre-authorised panel</div>
<div class="service-date">Service Date: ${serviceDate || today} &nbsp;|&nbsp; Ordered: ${today}</div>
<div class="patient-grid">
  <div class="patient-field"><label>Patient Name</label><span>${name || '____________________'}</span></div>
  <div class="patient-field"><label>Date of Birth</label><span>____________________</span></div>
  <div class="patient-field"><label>Sex</label><span>____________________</span></div>
  <div class="patient-field"><label>Telephone</label><span>____________________</span></div>
  <div class="patient-field full"><label>Address</label><span>____________________</span></div>
</div>
${testSections}
<div class="note">Note: Fasting required for Glucose and Lipid Assessment. Separate requisitions required for cytology and histology/pathology tests.</div>
</body>
</html>`;

  return new Blob([html], { type: 'text/html' });
}

function downloadRequisition(profile: ProfileResponse | null) {
  const today = new Date().toISOString().slice(0, 10);
  const blob = buildRequisitionBlob(profile, today);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-requisition-${today}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// Group lab records by recorded_date, newest first
function groupByDate(records: LabRecordResponse[]): Array<{ date: string; records: LabRecordResponse[] }> {
  const map = new Map<string, LabRecordResponse[]>();
  for (const r of records) {
    const list = map.get(r.recorded_date) ?? [];
    list.push(r);
    map.set(r.recorded_date, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, recs]) => ({
      date,
      records: recs.sort((a, b) => a.test_name.localeCompare(b.test_name)),
    }));
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function LabTestPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedRecords, setParsedRecords] = useState<ParsedLabEntry[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([fetchProfile(), fetchLabs()]).then(([profileResult, labsResult]) => {
      if (!isMounted) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (labsResult.status === 'fulfilled') setLabs(labsResult.value);
      setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  async function handleParse() {
    if (!file) return;
    const groqKey = getGroqKey();
    const mistralKey = getMistralKey();
    if (!groqKey && !mistralKey) {
      setParseError('No AI keys configured. Add your Groq or Mistral key in Settings.');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setParsedRecords(null);
    setSaveSuccess(false);

    try {
      const form = new FormData();
      form.append('file', file);
      if (serviceDate) form.append('service_date', serviceDate);

      const headers: Record<string, string> = {};
      if (groqKey) headers['x-groq-key'] = groqKey;
      if (mistralKey) headers['x-mistral-key'] = mistralKey;

      const res = await fetch('/api/parse-lab', { method: 'POST', headers, body: form });
      const data = await res.json() as { records?: ParsedLabEntry[]; error?: string; service_date?: string };

      if (!res.ok || !data.records?.length) {
        setParseError(data.error ?? 'Could not extract results. Please try a clearer image.');
        return;
      }

      setParsedRecords(data.records);
      if (data.service_date && !serviceDate) setServiceDate(data.service_date);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSave() {
    if (!parsedRecords?.length) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const date = serviceDate || new Date().toISOString().slice(0, 10);
      const payloads: LabRecordCreate[] = parsedRecords.map((r) => ({
        test_name: r.test_name,
        value: r.value,
        unit: r.unit ?? null,
        reference_range: r.reference_range ?? null,
        recorded_date: date,
      }));

      const saved = await Promise.all(payloads.map((p) => createLabRecord(p)));
      setLabs((prev) => [...prev, ...saved]);
      setSaveSuccess(true);
      setParsedRecords(null);
      setFile(null);
      setServiceDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to save results.');
    } finally {
      setIsSaving(false);
    }
  }

  const grouped = groupByDate(labs);

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Health</p>
        <h1 className="text-2xl font-bold text-slate-900">Lab Tests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Download your personalised requisition, upload results, and track biomarkers over time.
        </p>
      </div>

      {/* Requisition card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base">Lab Requisition</CardTitle>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-filled with the recommended panel for your health program.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
            {REQUISITION_TESTS.map(({ section, tests }) => (
              <div key={section}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{section}</p>
                <ul className="space-y-1.5">
                  {tests.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Button onClick={() => downloadRequisition(profile)} className="gap-2" size="sm">
            <Download className="h-3.5 w-3.5" />
            Download Requisition
          </Button>
          <p className="text-xs text-slate-400 mt-2">
            Downloads as HTML — open in browser and print/save as PDF.
          </p>
        </CardContent>
      </Card>

      {/* Upload card */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base">Upload Lab Results</CardTitle>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a photo or scan of your lab report. AI will extract all numeric results automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Lab report image (JPEG, PNG, WebP)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setParsedRecords(null);
                  setSaveSuccess(false);
                  setParseError('');
                }}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="sm:w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Service date (optional)
              </label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">Results saved successfully!</p>
            </div>
          )}

          {/* Parsed preview */}
          {parsedRecords && parsedRecords.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-3">
                {parsedRecords.length} result{parsedRecords.length !== 1 ? 's' : ''} extracted — review before saving
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-1.5 pr-4 text-xs font-semibold text-blue-700">Test</th>
                      <th className="text-right py-1.5 pr-4 text-xs font-semibold text-blue-700">Value</th>
                      <th className="text-left py-1.5 pr-4 text-xs font-semibold text-blue-700">Unit</th>
                      <th className="text-left py-1.5 text-xs font-semibold text-blue-700">Ref. Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.map((r, i) => (
                      <tr key={`${r.test_name}-${i}`} className="border-b border-blue-100 last:border-0">
                        <td className="py-1.5 pr-4 font-medium text-slate-800">{r.test_name}</td>
                        <td className="py-1.5 pr-4 text-right font-mono text-slate-700">{r.value}</td>
                        <td className="py-1.5 pr-4 text-slate-500">{r.unit ?? '—'}</td>
                        <td className="py-1.5 text-slate-500">{r.reference_range ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
                  {isSaving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" />Save All Results</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setParsedRecords(null)}>
                  Discard
                </Button>
              </div>
            </div>
          )}

          {!parsedRecords && (
            <Button onClick={handleParse} disabled={!file || isParsing} size="sm" className="gap-2">
              {isParsing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Extracting results…</>
                : <><Upload className="h-3.5 w-3.5" />Extract with AI</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results history — sorted newest first */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">History</p>
          <h2 className="text-lg font-bold text-slate-900">Past Results</h2>
        </div>
        {labs.length > 0 && (
          <Badge variant="secondary">
            {grouped.length} visit{grouped.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <FlaskConical className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">No lab results yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload your first lab report above to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ date, records }) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-slate-700">{formatDate(date)}</span>
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">
                  {records.length} test{records.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {records.map((rec) => (
                  <LabResultCard key={rec.id} record={rec} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function LabResultCard({ record }: Readonly<{ record: LabRecordResponse }>) {
  const isAbnormal = record.evaluation.is_abnormal;
  const status = record.evaluation.status;

  return (
    <Card className={`overflow-hidden ${isAbnormal ? 'border-amber-200' : 'border-slate-200'}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{record.test_name}</p>
          {isAbnormal && (
            <Badge
              variant="outline"
              className="text-amber-700 border-amber-300 bg-amber-50 text-xs flex-shrink-0"
            >
              {status}
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold font-mono ${isAbnormal ? 'text-amber-700' : 'text-slate-900'}`}>
            {record.processed.normalized_value}
          </span>
          {record.processed.normalized_unit && (
            <span className="text-sm text-slate-500">{record.processed.normalized_unit}</span>
          )}
        </div>
        {record.reference_range && (
          <p className="text-xs text-slate-400 mt-1">Ref: {record.reference_range}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            record.processed.trend === 'improving'
              ? 'bg-emerald-500'
              : record.processed.trend === 'worsening'
              ? 'bg-red-400'
              : 'bg-slate-300'
          }`} />
          <span className="text-xs text-slate-400 capitalize">{record.processed.trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
