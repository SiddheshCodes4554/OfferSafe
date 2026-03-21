import { useState, useEffect } from 'react';
import { analyzeDocument, analyzeText, type AnalysisResponse } from '../api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import FileUpload from '../components/FileUpload';
import TextInput from '../components/TextInput';
import CompanyVerify from '../components/CompanyVerify';
import AnalysisResult from '../components/AnalysisResult';

type InputMode = 'pdf' | 'text' | 'company';
type AppState = 'idle' | 'loading' | 'result' | 'error';

interface ScanRow {
  id: string;
  input_type: string;
  trust_score: number;
  risk_level: string;
  red_flag_count: number;
  created_at: string;
}

const TABS: { key: InputMode; label: string; icon: string }[] = [
  { key: 'pdf', label: 'Upload PDF', icon: '📄' },
  { key: 'text', label: 'Paste Text', icon: '📝' },
  { key: 'company', label: 'Verify Company', icon: '🏢' },
];

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<InputMode>('pdf');
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* ── Load scan history ───────────────────────────────── */
  const loadHistory = async () => {
    const { data } = await supabase
      .from('student_scans')
      .select('id, input_type, trust_score, risk_level, red_flag_count, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data as ScanRow[]);
  };

  useEffect(() => { loadHistory(); }, []);

  /* ── Save scan to DB ─────────────────────────────────── */
  const saveScan = async (res: AnalysisResponse, inputType: string) => {
    if (!user) return;
    await supabase.from('student_scans').insert({
      student_id: user.id,
      input_type: inputType,
      trust_score: res.trust_score,
      risk_level: res.risk_level,
      analysis_layers: res.analysis_layers ?? [],
      findings: res.findings ?? [],
      red_flag_count: res.red_flag_count,
      text_preview: res.extracted_text_preview,
    });
    loadHistory();
  };

  const runAnalysis = async (fn: () => Promise<AnalysisResponse>, inputType: string) => {
    setState('loading');
    setError(null);
    try {
      const data = await fn();
      setResult(data);
      setState('result');
      saveScan(data, inputType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  };

  const handleFile = (file: File) => runAnalysis(() => analyzeDocument(file), 'pdf');
  const handleText = (text: string) => runAnalysis(() => analyzeText(text), 'text');

  const reset = () => {
    setState('idle');
    setResult(null);
    setError(null);
  };

  const switchTab = (tab: InputMode) => { reset(); setMode(tab); };

  const riskColor = (score: number) =>
    score < 40 ? 'text-red-400' : score < 60 ? 'text-orange-400' : score < 75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ── Navbar ────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-text-primary leading-tight">SafeOffer</h1>
              <p className="text-[11px] text-text-muted tracking-wide uppercase">Student Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-medium text-text-secondary hover:text-accent transition-colors"
            >
              {showHistory ? '← Back to Scanner' : '📋 Scan History'}
            </button>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-text-muted hidden sm:inline truncate max-w-[120px]">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="text-xs font-medium text-text-muted hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-12 sm:py-16">
        {showHistory ? (
          /* ── Scan History ──────────────────────────────── */
          <div className="w-full max-w-3xl space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-text-primary">Scan History</h2>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-elevated p-12 text-center">
                <p className="text-text-muted">No scans yet. Go scan your first offer letter!</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-left px-5 py-3">Type</th>
                      <th className="text-left px-5 py-3">Trust Score</th>
                      <th className="text-left px-5 py-3">Risk Level</th>
                      <th className="text-left px-5 py-3">Red Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((scan) => (
                      <tr key={scan.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                        <td className="px-5 py-3 text-text-secondary">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-medium">
                            {scan.input_type.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-5 py-3 font-bold ${riskColor(scan.trust_score)}`}>
                          {scan.trust_score}%
                        </td>
                        <td className="px-5 py-3 text-text-secondary">{scan.risk_level}</td>
                        <td className="px-5 py-3 text-text-muted">{scan.red_flag_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── Scanner UI (existing) ──────────────────── */
          <div className="w-full max-w-2xl space-y-8">
            {(state === 'idle' || state === 'loading' || state === 'error') && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
                    Verify Your Offer Letter
                  </h2>
                  <p className="text-text-secondary max-w-lg mx-auto">
                    Upload a PDF, paste the letter text, or verify the company
                    — our AI analyzes it for fraud patterns and scam indicators.
                  </p>
                </div>

                <div className="flex rounded-xl border border-border bg-surface-elevated p-1 gap-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => switchTab(tab.key)}
                      disabled={state === 'loading'}
                      className={`
                        flex-1 flex items-center justify-center gap-2
                        rounded-lg py-2.5 text-sm font-medium transition-all duration-200
                        ${mode === tab.key ? 'bg-accent/15 text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'}
                        ${state === 'loading' ? 'pointer-events-none opacity-60' : ''}
                      `}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {mode === 'pdf' && <FileUpload onFileSelected={handleFile} isLoading={state === 'loading'} />}
                {mode === 'text' && <TextInput onSubmit={handleText} isLoading={state === 'loading'} />}
                {mode === 'company' && <CompanyVerify />}

                {state === 'error' && error && (
                  <div className="animate-fade-in-up rounded-xl border border-danger/30 bg-danger-soft/15 px-5 py-4 flex items-start gap-3">
                    <span className="text-danger text-lg shrink-0 mt-0.5">✕</span>
                    <div>
                      <p className="text-sm font-semibold text-danger">Analysis failed</p>
                      <p className="text-sm text-text-muted mt-0.5">{error}</p>
                    </div>
                    <button onClick={reset} className="ml-auto text-xs text-text-muted hover:text-text-primary transition-colors">
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {['6-Layer AI Engine', 'OCR Extraction', 'Keyword Scanner', 'WHOIS Verification'].map((t) => (
                    <span key={t} className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {state === 'result' && result && (
              <AnalysisResult data={result} onReset={reset} />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-text-muted">
        SafeOffer &copy; {new Date().getFullYear()} &mdash; Built with FastAPI, DistilBERT, and Tesseract OCR
      </footer>
    </div>
  );
}
