'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Download, FlaskConical, CheckCircle2, AlertCircle, LogIn, X, ChevronDown, ChevronRight } from 'lucide-react';

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

// ---------------------------------------------------------------------------
// Industry-standard units and reference ranges per test.
// First entry in each array is the primary/default option.
// ---------------------------------------------------------------------------
type UnitRefOption = { unit: string; referenceRange: string };

const LAB_STANDARDS: Record<string, UnitRefOption[]> = {
  // Biochemistry
  'glucose (fasting)':              [{ unit: 'mmol/L',        referenceRange: '3.9–6.1'   }, { unit: 'mg/dL',   referenceRange: '70–99'    }],
  'hemoglobin a1c':                 [{ unit: '%',             referenceRange: '4.0–5.6'   }, { unit: 'mmol/mol',referenceRange: '20–38'    }],
  'creatinine':                     [{ unit: 'umol/L',        referenceRange: '45–110'    }, { unit: 'mg/dL',   referenceRange: '0.5–1.2'  }],
  'egfr':                           [{ unit: 'mL/min/1.73m²', referenceRange: '>= 60'     }],
  'uric acid':                      [{ unit: 'mmol/L',        referenceRange: '0.15–0.42' }, { unit: 'mg/dL',   referenceRange: '2.6–7.2'  }],
  'alt':                            [{ unit: 'U/L',           referenceRange: '7–56'      }],
  'sodium':                         [{ unit: 'mmol/L',        referenceRange: '136–145'   }, { unit: 'mEq/L',   referenceRange: '136–145'  }],
  'potassium':                      [{ unit: 'mmol/L',        referenceRange: '3.5–5.0'   }, { unit: 'mEq/L',   referenceRange: '3.5–5.0'  }],
  'albumin/creatinine ratio':       [{ unit: 'mg/mmol',       referenceRange: '< 2.0'     }, { unit: 'mg/g',    referenceRange: '< 30'     }],
  // Lipid Panel
  'cholesterol':                    [{ unit: 'mmol/L',        referenceRange: '< 5.2'     }, { unit: 'mg/dL',   referenceRange: '< 200'    }],
  'triglycerides':                  [{ unit: 'mmol/L',        referenceRange: '< 1.7'     }, { unit: 'mg/dL',   referenceRange: '< 150'    }],
  'hdl cholesterol':                [{ unit: 'mmol/L',        referenceRange: '> 1.0'     }, { unit: 'mg/dL',   referenceRange: '> 40'     }],
  'ldl cholesterol':                [{ unit: 'mmol/L',        referenceRange: '< 3.4'     }, { unit: 'mg/dL',   referenceRange: '< 130'    }],
  'non-hdl-cholesterol':            [{ unit: 'mmol/L',        referenceRange: '< 4.2'     }, { unit: 'mg/dL',   referenceRange: '< 160'    }],
  'cholesterol/hdl ratio':          [{ unit: '',              referenceRange: '< 5.0'     }],
  // CBC
  'hemoglobin':                     [{ unit: 'g/L',           referenceRange: '115–175'   }, { unit: 'g/dL',    referenceRange: '11.5–17.5'}],
  'hematocrit':                     [{ unit: 'l/l',           referenceRange: '0.36–0.52' }, { unit: '%',       referenceRange: '36–52'    }],
  'rbc':                            [{ unit: '10E12/L',       referenceRange: '3.8–5.9'   }],
  'mcv':                            [{ unit: 'fl',            referenceRange: '80–100'    }],
  'mch':                            [{ unit: 'pg',            referenceRange: '27–33'     }],
  'mchc':                           [{ unit: 'g/L',           referenceRange: '320–360'   }, { unit: 'g/dL',    referenceRange: '32.0–36.0'}],
  'rdw':                            [{ unit: '%',             referenceRange: '11.5–14.5' }],
  'wbc':                            [{ unit: '10E9/L',        referenceRange: '4.0–11.0'  }],
  'platelets':                      [{ unit: '10E9/L',        referenceRange: '150–400'   }],
  'mpv':                            [{ unit: 'fl',            referenceRange: '7.5–12.5'  }],
  'neutrophils':                    [{ unit: '10E9/L',        referenceRange: '1.8–7.5'   }],
  'lymphocytes':                    [{ unit: '10E9/L',        referenceRange: '1.0–4.8'   }],
  'monocytes':                      [{ unit: '10E9/L',        referenceRange: '0.2–1.0'   }],
  'eosinophils':                    [{ unit: '10E9/L',        referenceRange: '0.0–0.5'   }],
  'basophils':                      [{ unit: '10E9/L',        referenceRange: '0.0–0.1'   }],
  // Other Tests
  'ferritin':                       [{ unit: 'ug/L',          referenceRange: '12–300'    }, { unit: 'ng/mL',   referenceRange: '12–300'   }],
  'ggt':                            [{ unit: 'U/L',           referenceRange: '5–61'      }],
  'hscrp':                          [{ unit: 'mg/L',          referenceRange: '< 1.0'     }],
  'c-peptide':                      [{ unit: 'nmol/L',        referenceRange: '0.37–1.47' }, { unit: 'ng/mL',   referenceRange: '1.1–4.4'  }],
  'vitamin b12':                    [{ unit: 'pmol/L',        referenceRange: '148–738'   }, { unit: 'pg/mL',   referenceRange: '200–1000' }],
  'tsh':                            [{ unit: 'mIU/L',         referenceRange: '0.4–4.0'   }, { unit: 'uIU/mL',  referenceRange: '0.4–4.0'  }],
};

/** Normalise a test name to a lookup key: lowercase, strip parenthetical suffixes, trim. */
function normaliseTestKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')   // remove "(umol/L)", "(Fasting)", etc.
    .replace(/[^a-z0-9\s/\-]/g, '') // remove special chars except / and -
    .trim();
}

/** Return the unit/reference options for a test name (empty array if unknown). */
function getTestStandards(testName: string): UnitRefOption[] {
  const key = normaliseTestKey(testName);
  if (LAB_STANDARDS[key]) return LAB_STANDARDS[key];
  // Partial match: find the longest key contained in our query or vice-versa
  let best: UnitRefOption[] = [];
  let bestLen = 0;
  for (const [k, v] of Object.entries(LAB_STANDARDS)) {
    if ((key.includes(k) || k.includes(key)) && k.length > bestLen) {
      best = v; bestLen = k.length;
    }
  }
  return best;
}

/** Given a test name and a unit string, return the matching reference range (or first default). */
function getReferenceRange(testName: string, unit: string): string {
  const options = getTestStandards(testName);
  if (!options.length) return '';
  return (options.find((o) => o.unit === unit) ?? options[0]).referenceRange;
}

// ---------------------------------------------------------------------------
// Tests ordered on the requisition
// ---------------------------------------------------------------------------
const REQUISITION_TESTS = [
  {
    section: 'Biochemistry',
    tests: [
      'Glucose (Fasting)',
      'Hemoglobin A1C (%)',
      'Creatinine (umol/L)',
      'eGFR (mL/min/1.73m²)',
      'Uric Acid',
      'ALT (U/L)',
      'Sodium (mmol/L)',
      'Potassium (mmol/L)',
      'Albumin/Creatinine Ratio (Urine)',
    ],
  },
  {
    section: 'Lipid Panel',
    tests: [
      'Cholesterol (mmol/L)',
      'Triglycerides (mmol/L)',
      'HDL Cholesterol (mmol/L)',
      'LDL Cholesterol (mmol/L)',
      'NON-HDL-Cholesterol (mmol/L)',
      'Cholesterol/HDL Ratio',
    ],
  },
  {
    section: 'Complete Blood Count (CBC)',
    tests: [
      'Hemoglobin (g/L)',
      'Hematocrit (l/l)',
      'RBC (10E12/L)',
      'MCV (fl)',
      'MCH (pg)',
      'MCHC (g/L)',
      'RDW',
      'WBC (10E9/L)',
      'Platelets (10E9/L)',
      'MPV (fl)',
      'Neutrophils (10E9/L)',
      'Lymphocytes (10E9/L)',
      'Monocytes (10E9/L)',
      'Eosinophils (10E9/L)',
      'Basophils (10E9/L)',
    ],
  },
  {
    section: 'Other Tests',
    tests: [
      'Ferritin (ug/L)',
      'GGT',
      'hsCRP',
      'C-peptide (Not Citrullinated peptide Ab)',
      'Vitamin B12 (pmol/L)',
      'TSH (mIU/L)',
    ],
  },
];

function buildRequisitionBlob(profile: ProfileResponse | null, serviceDate: string): Blob {
  const today = new Date().toLocaleDateString('en-CA');
  const name = profile?.name ?? '';

  const testSections = REQUISITION_TESTS.map(
    ({ section, tests }) =>
      `<div class="section">
        <div class="section-title">${section}</div>
        <div class="test-header">
          <span class="col-name">Test</span>
          <span class="col-result">Result</span>
          <span class="col-unit">Unit</span>
          <span class="col-ref">Reference Range</span>
        </div>
        ${tests.map((t) => {
          const standards = getTestStandards(t);
          const defaultUnit = standards[0]?.unit ?? '';
          const defaultRef  = standards[0]?.referenceRange ?? '';
          return `<div class="test-row">
          <span class="col-name"><span class="check">&#10003;</span>${t}</span>
          <span class="col-result"><input type="number" class="result-input" min="0" max="1000000" step="any" placeholder="" /></span>
          <span class="col-unit">${defaultUnit}</span>
          <span class="col-ref">${defaultRef}</span>
        </div>`;
        }).join('')}
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
  .patient-field label{font-size:10px;color:#666;display:block;margin-bottom:2px}
  .patient-field input{font-weight:600;font-size:12px;border:none;border-bottom:1px solid #999;outline:none;width:100%;background:transparent;padding:1px 0;font-family:Arial,sans-serif;color:#111}
  .patient-field input:focus{border-bottom-color:#1a56db}
  .full{grid-column:span 2}
  .section{margin-bottom:16px}
  .section-title{font-weight:bold;font-size:12px;background:#f0f0f0;padding:4px 8px;margin-bottom:0}
  .test-header,.test-row{display:grid;grid-template-columns:2.4fr 1fr 1fr 1.4fr;align-items:center;padding:3px 8px;border-bottom:1px solid #eee}
  .test-header{background:#f7f7f7;font-size:10px;font-weight:600;color:#666;border-bottom:1px solid #ccc}
  .check{color:#1a56db;font-weight:bold;font-size:13px;margin-right:5px}
  .result-input{border:none;border-bottom:1px solid #bbb;outline:none;width:90%;background:transparent;font-size:11px;font-family:Arial,sans-serif;color:#111;padding:1px 0;-moz-appearance:textfield;appearance:textfield}
  .result-input::-webkit-outer-spin-button,.result-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .result-input:focus{border-bottom-color:#1a56db}
  .result-input:invalid{border-bottom-color:#e53e3e;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Ccircle cx='5' cy='5' r='4' fill='%23e53e3e'/%3E%3C/svg%3E") no-repeat right center;padding-right:14px}
  .error-banner{display:none;background:#fff5f5;border:1px solid #fed7d7;color:#c53030;font-size:11px;padding:6px 10px;margin-bottom:12px;border-radius:4px}
  .error-banner.visible{display:block}
  @media print{.result-input:invalid{border-bottom-color:#e53e3e}}
  .date-row{display:flex;align-items:center;gap:16px;margin-bottom:16px;font-size:11px;color:#555}
  .date-field label{font-size:10px;color:#666;display:block;margin-bottom:1px}
  .date-field input{font-size:11px;border:none;border-bottom:1px solid #999;outline:none;background:transparent;font-family:Arial,sans-serif;color:#111;padding:1px 2px;width:110px}
  .date-field input:focus{border-bottom-color:#1a56db}
  .note{margin-top:24px;font-size:10px;color:#666;border-top:1px solid #ddd;padding-top:8px}
  @media print{.patient-field input,.result-input,.date-field input{border-bottom-color:#999}}
</style>
</head>
<body>
<h1>Laboratory Requisition</h1>
<div class="subtitle">WeightLoss Health Program &mdash; Pre-authorised panel</div>
<div class="date-row">
  <div class="date-field"><label>Service Date</label><input type="date" value="${serviceDate || today}" /></div>
  <div class="date-field"><label>Ordered Date</label><input type="date" value="${today}" /></div>
</div>
<div class="patient-grid">
  <div class="patient-field"><label>Patient Name</label><input type="text" value="${name.replace(/"/g, '&quot;')}" placeholder="Enter name" /></div>
  <div class="patient-field"><label>Date of Birth</label><input type="text" placeholder="DD/MM/YYYY" /></div>
  <div class="patient-field"><label>Sex</label><input type="text" placeholder="M / F / Other" /></div>
  <div class="patient-field"><label>Telephone</label><input type="text" placeholder="Phone number" /></div>
  <div class="patient-field full"><label>Address</label><input type="text" placeholder="Street, City, Postcode" /></div>
</div>
${testSections}
<div class="note">Note: Fasting required for Glucose and Lipid Assessment. Separate requisitions required for cytology and histology/pathology tests.</div>
<div id="err-banner" class="error-banner">&#9888; Some result values are invalid. Only positive numbers are accepted (e.g. 6.2, 94, 0.81).</div>
<script>
(function(){
  function sanitise(input){
    // Strip anything that isn't a digit, decimal point, or leading minus
    var raw=input.value.replace(/[^0-9.]/g,'');
    // Allow at most one decimal point
    var parts=raw.split('.');
    if(parts.length>2)raw=parts[0]+'.'+parts.slice(1).join('');
    if(input.value!==raw)input.value=raw;
    var n=parseFloat(raw);
    var ok=raw===''||(!isNaN(n)&&n>=0&&n<=1000000);
    input.style.borderBottomColor=ok?'':'#e53e3e';
    showBanner();
  }
  function showBanner(){
    var bad=document.querySelectorAll('.result-input[style*="#e53e3e"]');
    var banner=document.getElementById('err-banner');
    if(banner)banner.className='error-banner'+(bad.length>0?' visible':'');
  }
  document.addEventListener('DOMContentLoaded',function(){
    var inputs=document.querySelectorAll('.result-input');
    inputs.forEach(function(inp){
      inp.addEventListener('input',function(){sanitise(this);});
      inp.addEventListener('paste',function(e){
        e.preventDefault();
        var text=(e.clipboardData||window.clipboardData).getData('text');
        // Accept only numeric paste
        var num=parseFloat(text.replace(/[^0-9.]/g,''));
        this.value=isNaN(num)?'':String(num);
        sanitise(this);
      });
      inp.addEventListener('keydown',function(e){
        // Block letters and special chars; allow digits, dot, backspace, delete, arrows, tab
        var allowed=[8,9,37,38,39,40,46];
        var isDigit=e.key>='0'&&e.key<='9';
        var isDot=e.key==='.';
        var isCtrl=e.ctrlKey||e.metaKey;
        if(!isDigit&&!isDot&&!isCtrl&&allowed.indexOf(e.keyCode)===-1){
          e.preventDefault();
        }
        // Prevent second decimal point
        if(isDot&&this.value.indexOf('.')>-1)e.preventDefault();
      });
    });
  });
})();
</script>
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((date: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<ParsedLabEntry[] | null>(null);
  // Editable draft state — mirrors parsedRecords but uses strings for controlled inputs
  const [draftValues, setDraftValues] = useState<{ value: string; unit: string; refRange: string }[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ value: string | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation rules matching backend: value float ge=0 le=1_000_000
  const validateValue = useCallback((raw: string): string | null => {
    if (!raw.trim()) return 'Required';
    const n = Number(raw);
    if (isNaN(n) || !isFinite(n)) return 'Must be a valid number';
    if (n < 0) return 'Must be ≥ 0';
    if (n > 1_000_000) return 'Must be ≤ 1,000,000';
    return null;
  }, []);

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

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setParseError('Server error while processing the file. Please restart the dev server and try again.');
        return;
      }

      const data = await res.json() as { records?: ParsedLabEntry[]; error?: string; service_date?: string };

      if (!res.ok || !data.records?.length) {
        setParseError(data.error ?? 'Could not extract results. Please try a clearer file.');
        return;
      }

      setParsedRecords(data.records);
      setDraftValues(data.records.map((r) => {
        const options = getTestStandards(r.test_name);
        // Use AI unit if it matches a known option, otherwise fall back to primary
        const matchedOption =
          options.find((o) => o.unit === (r.unit ?? '')) ?? options[0];
        const unit     = matchedOption?.unit            ?? r.unit          ?? '';
        const refRange = matchedOption?.referenceRange  ?? r.reference_range ?? '';
        return { value: String(r.value), unit, refRange };
      }));
      setFieldErrors(data.records.map(() => ({ value: null })));
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
    setSessionExpired(false);
    setParseError('');

    try {
      const date = serviceDate || new Date().toISOString().slice(0, 10);
      const payloads: LabRecordCreate[] = parsedRecords.map((r, i) => ({
        test_name: r.test_name,
        value: parseFloat(draftValues[i]?.value ?? String(r.value)),
        unit: draftValues[i]?.unit.trim() || null,
        reference_range: draftValues[i]?.refRange.trim() || null,
        recorded_date: date,
      }));

      const saved = await Promise.all(payloads.map((p) => createLabRecord(p)));
      setLabs((prev) => [...prev, ...saved]);
      setSavedCount(saved.length);
      setSaveSuccess(true);
      setParsedRecords(null);
      setDraftValues([]);
      setFieldErrors([]);
      setFile(null);
      setServiceDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save results.';
      if (msg === 'SESSION_EXPIRED') {
        setSessionExpired(true);
      } else {
        setParseError(msg);
      }
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
            Upload a PDF or image of your lab report. AI will extract all numeric results automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Lab report (PDF, JPEG, PNG, WebP)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setParsedRecords(null);
                  setDraftValues([]);
                  setFieldErrors([]);
                  setSaveSuccess(false);
                  setParseError('');
                  setSessionExpired(false);
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

          {sessionExpired && (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Session expired</p>
                  <p className="text-xs text-amber-700 mt-0.5">Your login session has timed out. Please log in again — your extracted results will still be here.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => router.push('/login')}
              >
                <LogIn className="h-3.5 w-3.5" />
                Log in
              </Button>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Results saved successfully!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{savedCount} test result{savedCount !== 1 ? 's' : ''} added to your history.</p>
              </div>
            </div>
          )}

          {/* Parsed preview — editable with validation */}
          {parsedRecords && parsedRecords.length > 0 && (() => {
            const hasErrors = fieldErrors.some((e) => e.value !== null);

            function updateDraft(i: number, field: 'value' | 'unit', val: string) {
              setDraftValues((prev) => prev.map((d, idx) => {
                if (idx !== i) return d;
                if (field === 'unit') {
                  // Auto-update refRange when unit changes
                  const refRange = getReferenceRange(parsedRecords![i].test_name, val);
                  return { ...d, unit: val, refRange };
                }
                return { ...d, value: val };
              }));
              if (field === 'value') {
                setFieldErrors((prev) => prev.map((e, idx) =>
                  idx === i ? { value: validateValue(val) } : e,
                ));
              }
            }

            function removeRow(i: number) {
              setParsedRecords((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
              setDraftValues((prev) => prev.filter((_, idx) => idx !== i));
              setFieldErrors((prev) => prev.filter((_, idx) => idx !== i));
            }

            return (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-blue-900">
                    {parsedRecords.length} result{parsedRecords.length !== 1 ? 's' : ''} extracted — review &amp; edit before saving
                  </p>
                  {hasErrors && (
                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Fix errors to save
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200">
                        <th className="text-left py-1.5 pr-3 text-xs font-semibold text-blue-700 w-[38%]">Test</th>
                        <th className="text-left py-1.5 pr-3 text-xs font-semibold text-blue-700 w-[18%]">Value <span className="text-red-500">*</span></th>
                        <th className="text-left py-1.5 pr-3 text-xs font-semibold text-blue-700 w-[16%]">Unit</th>
                        <th className="text-left py-1.5 pr-3 text-xs font-semibold text-blue-700 w-[22%]">Ref. Range</th>
                        <th className="w-[6%]" />
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.map((r, i) => {
                        const draft = draftValues[i] ?? { value: String(r.value), unit: r.unit ?? '', refRange: r.reference_range ?? '' };
                        const err = fieldErrors[i]?.value ?? null;
                        return (
                          <tr key={`${r.test_name}-${i}`} className="border-b border-blue-100 last:border-0 align-top">
                            <td className="py-2 pr-3 font-medium text-slate-800 text-xs leading-tight pt-2.5">{r.test_name}</td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="1000000"
                                value={draft.value}
                                onChange={(e) => updateDraft(i, 'value', e.target.value)}
                                className={`w-full rounded border px-2 py-1 text-xs font-mono bg-white focus:outline-none focus:ring-1 ${
                                  err
                                    ? 'border-red-400 focus:ring-red-400 text-red-700'
                                    : 'border-blue-200 focus:ring-blue-400 text-slate-800'
                                }`}
                              />
                              {err && <p className="text-red-600 text-[10px] mt-0.5 leading-tight">{err}</p>}
                            </td>
                            <td className="py-2 pr-3">
                              {(() => {
                                const options = getTestStandards(r.test_name);
                                return options.length > 1 ? (
                                  <select
                                    value={draft.unit}
                                    onChange={(e) => updateDraft(i, 'unit', e.target.value)}
                                    className="w-full rounded border border-blue-200 px-2 py-1 text-xs bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  >
                                    {options.map((o) => (
                                      <option key={o.unit} value={o.unit}>{o.unit || '—'}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs text-slate-600 px-1">{draft.unit || '—'}</span>
                                );
                              })()}
                            </td>
                            <td className="py-2 pr-3">
                              <span className="text-xs text-slate-500 px-1">{draft.refRange || '—'}</span>
                            </td>
                            <td className="py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(i)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                                title="Remove row"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving || hasErrors} size="sm" className="gap-2">
                    {isSaving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" />Save All Results</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setParsedRecords(null); setDraftValues([]); setFieldErrors([]); }}>
                    Discard
                  </Button>
                </div>
              </div>
            );
          })()}

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
        <div className="space-y-4">
          {grouped.map(({ date, records }) => {
            const isCollapsed = collapsedGroups.has(date);
            return (
              <div key={date}>
                <button
                  type="button"
                  onClick={() => toggleGroup(date)}
                  className="w-full flex items-center gap-3 mb-3 group"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {formatDate(date)}
                  </span>
                  <span className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">
                    {records.length} test{records.length !== 1 ? 's' : ''}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {records.map((rec) => (
                      <LabResultCard key={rec.id} record={rec} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
