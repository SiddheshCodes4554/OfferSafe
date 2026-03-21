import type { AnalysisResponse, AnalysisFinding, AnalysisLayer } from '../api';
import TrustScoreGauge from './TrustScoreGauge';
import RedFlagList from './RedFlagList';

interface AnalysisResultProps {
  data: AnalysisResponse;
  onReset: () => void;
}

export default function AnalysisResult({ data, onReset }: AnalysisResultProps) {
  const layers = data.analysis_layers ?? [];
  const findings = data.findings ?? [];

  return (
    <div className="animate-fade-in-up space-y-8 w-full max-w-2xl mx-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">Deep Analysis Complete</h2>
        <p className="text-sm text-text-muted truncate max-w-md mx-auto">
          {data.filename}
        </p>
      </div>

      {/* ── Score Gauge ───────────────────────────────────── */}
      <div className="flex justify-center">
        <TrustScoreGauge score={data.trust_score} riskLevel={data.risk_level} />
      </div>

      {/* ── Cap Warning ───────────────────────────────────── */}
      {data.cap_applied && data.cap_reason && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-5 py-3 flex items-start gap-3">
          <span className="text-warning text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-warning">Score Capped</p>
            <p className="text-xs text-text-muted mt-0.5">
              Trust score was limited because {data.cap_reason}
            </p>
          </div>
        </div>
      )}

      {/* ── Layer Breakdown ────────────────────────────────── */}
      {layers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Score Breakdown
          </h3>
          <div className="space-y-2">
            {layers.map((layer) => (
              <LayerBar key={layer.name} layer={layer} />
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Risk Score" value={`${data.fake_probability}%`} />
        <StatCard label="Analysis Engine" value={data.model_used === 'deep_analysis_engine' ? '6-Layer' : data.model_used} />
        <StatCard label="Red Flags" value={String(data.red_flag_count)} />
      </div>

      {/* ── Red Flags ─────────────────────────────────────── */}
      <RedFlagList flags={data.red_flag_keywords} />

      {/* ── Detailed Findings ─────────────────────────────── */}
      {findings.length > 0 && (
        <details className="group rounded-xl border border-border bg-surface-elevated overflow-hidden">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between">
            <span>Detailed Findings ({findings.length})</span>
            <svg
              className="h-4 w-4 transition-transform group-open:rotate-180"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-5 pb-4 space-y-1.5 max-h-80 overflow-y-auto">
            {findings.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </div>
        </details>
      )}

      {/* ── Text Preview ──────────────────────────────────── */}
      <details className="group rounded-xl border border-border bg-surface-elevated overflow-hidden">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between">
          <span>Extracted Text Preview</span>
          <svg
            className="h-4 w-4 transition-transform group-open:rotate-180"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-5 pb-4">
          <pre className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed font-mono">
            {data.extracted_text_preview}
          </pre>
        </div>
      </details>

      {/* ── Scan Another ──────────────────────────────────── */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="
            rounded-xl border border-border bg-surface-elevated
            px-6 py-3 text-sm font-semibold text-text-primary
            transition-all hover:bg-surface-hover hover:border-border-hover
            hover:shadow-lg active:scale-[0.98]
          "
        >
          ↻ Scan Another Document
        </button>
      </div>
    </div>
  );
}

/* ── Layer Score Bar ─────────────────────────────────────────── */
function LayerBar({ layer }: { layer: AnalysisLayer }) {
  const scoreColor =
    layer.score < 40 ? 'bg-red-500' :
    layer.score < 60 ? 'bg-orange-500' :
    layer.score < 75 ? 'bg-amber-400' :
    'bg-emerald-500';

  const textColor =
    layer.score < 40 ? 'text-red-400' :
    layer.score < 60 ? 'text-orange-400' :
    layer.score < 75 ? 'text-amber-400' :
    'text-emerald-400';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-muted w-36 shrink-0 truncate">{layer.name}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${scoreColor}`}
          style={{ width: `${Math.max(2, layer.score)}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-10 text-right ${textColor}`}>
        {layer.score}
      </span>
      <span className="text-[10px] text-text-muted w-8 text-right">
        {Math.round(layer.weight * 100)}%
      </span>
    </div>
  );
}

/* ── Finding Row ────────────────────────────────────────────── */
function FindingRow({ finding }: { finding: AnalysisFinding }) {
  const icon = finding.status === 'pass' ? '✅' : finding.status === 'warn' ? '⚠️' : '❌';
  const borderColor =
    finding.status === 'pass' ? 'border-emerald-500/20' :
    finding.status === 'warn' ? 'border-amber-500/20' :
    'border-red-500/20';

  return (
    <div className={`flex items-start gap-2 text-xs py-1.5 border-b ${borderColor} last:border-b-0`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="text-text-muted opacity-70 w-24 shrink-0 truncate">{finding.layer}</span>
      <span className="text-text-secondary flex-1">{finding.detail}</span>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className="text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}
