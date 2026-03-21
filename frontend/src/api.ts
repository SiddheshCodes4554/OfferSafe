export interface RedFlag {
  keyword: string;
  count: number;
}

export interface AnalysisLayer {
  name: string;
  score: number;
  weight: number;
}

export interface AnalysisFinding {
  layer: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  severity: number;
}

export interface AnalysisResponse {
  filename: string;
  trust_score: number;
  risk_level: string;
  fake_probability: number;
  model_used: string;
  red_flag_keywords: RedFlag[];
  red_flag_count: number;
  extracted_text_preview: string;
  analysis_layers?: AnalysisLayer[];
  findings?: AnalysisFinding[];
  cap_applied?: boolean;
  cap_reason?: string;
}

export interface CompanyCheck {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface CompanyVerifyResponse {
  domain: string;
  trust_score: number;
  risk_level: string;
  checks: CompanyCheck[];
  whois: Record<string, string | number>;
}

/* ── PDF Upload analysis ─────────────────────────────────── */
export async function analyzeDocument(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `Server error (${res.status})`);
  }

  return res.json();
}

/* ── Pasted text analysis ────────────────────────────────── */
export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const res = await fetch('/analyze-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `Server error (${res.status})`);
  }

  return res.json();
}

/* ── Company / Domain verification ───────────────────────── */
export async function verifyCompany(company: string): Promise<CompanyVerifyResponse> {
  const res = await fetch('/verify-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `Server error (${res.status})`);
  }

  return res.json();
}
