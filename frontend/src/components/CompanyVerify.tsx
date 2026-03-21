import { useState, useCallback } from 'react';
import type { CompanyVerifyResponse } from '../api';
import { verifyCompany } from '../api';
import TrustScoreGauge from './TrustScoreGauge';

export default function CompanyVerify() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompanyVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await verifyCompany(trimmed);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [input]);

  const reset = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  const statusIcon = (s: string) =>
    s === 'pass' ? '✅' : s === 'warn' ? '⚠️' : '❌';

  const statusColor = (s: string) =>
    s === 'pass'
      ? 'border-success/20 bg-success-soft/10 text-success'
      : s === 'warn'
        ? 'border-warning/20 bg-warning-soft/10 text-warning'
        : 'border-danger/20 bg-danger-soft/10 text-danger';

  return (
    <div className="space-y-6">
      {/* Search bar */}
      {!result && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                disabled={loading}
                placeholder="Enter company name or domain (e.g. google.com)"
                className="
                  w-full rounded-xl border-2 border-border bg-surface-elevated
                  pl-11 pr-4 py-3.5 text-sm text-text-primary placeholder-text-muted
                  transition-all duration-200
                  focus:outline-none focus:border-accent
                  hover:border-border-hover
                  disabled:opacity-60
                "
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || input.trim().length < 2}
              className={`
                rounded-xl px-6 py-3.5 text-sm font-semibold whitespace-nowrap
                transition-all duration-200
                ${loading || input.trim().length < 2
                  ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-glow active:scale-[0.98] shadow-lg shadow-accent/20'
                }
              `}
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                '🔍 Verify'
              )}
            </button>
          </div>

          <p className="text-xs text-text-muted text-center">
            We'll check WHOIS records, DNS, domain age, and TLD reputation
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="animate-fade-in-up rounded-xl border border-danger/30 bg-danger-soft/15 px-5 py-4 flex items-start gap-3">
          <span className="text-danger text-lg shrink-0 mt-0.5">✕</span>
          <div>
            <p className="text-sm font-semibold text-danger">Verification failed</p>
            <p className="text-sm text-text-muted mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="animate-fade-in-up space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-text-primary">Company Verification</h2>
            <p className="text-sm text-text-muted font-mono">{result.domain}</p>
          </div>

          {/* Gauge */}
          <div className="flex justify-center">
            <TrustScoreGauge score={result.trust_score} riskLevel={result.risk_level} />
          </div>

          {/* Checks */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-3">
              Verification Checks
            </h3>
            {result.checks.map((c, i) => (
              <div
                key={i}
                className={`
                  rounded-lg border px-4 py-3 text-sm flex items-start gap-3
                  ${statusColor(c.status)}
                `}
              >
                <span className="shrink-0 mt-0.5">{statusIcon(c.status)}</span>
                <div>
                  <span className="font-medium capitalize">{c.check.replace(/_/g, ' ')}</span>
                  <span className="text-text-muted"> — {c.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* WHOIS data */}
          {Object.keys(result.whois).length > 0 && (
            <details className="group rounded-xl border border-border bg-surface-elevated overflow-hidden">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between">
                <span>WHOIS Data</span>
                <svg
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 space-y-1.5">
                {Object.entries(result.whois).map(([key, val]) => (
                  <div key={key} className="flex gap-3 text-sm">
                    <span className="text-text-muted capitalize min-w-[120px]">{key.replace(/_/g, ' ')}</span>
                    <span className="text-text-primary font-mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Reset */}
          <div className="flex justify-center pt-2">
            <button
              onClick={reset}
              className="
                rounded-xl border border-border bg-surface-elevated
                px-6 py-3 text-sm font-semibold text-text-primary
                transition-all hover:bg-surface-hover hover:border-border-hover
                hover:shadow-lg active:scale-[0.98]
              "
            >
              ↻ Verify Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
